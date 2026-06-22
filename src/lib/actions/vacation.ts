"use server";

import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import { revalidatePath } from "next/cache";
import { sendVacationStatusEmail } from "@/lib/email/transactional";
import { createNotification } from "@/lib/notifications/create";
import { AbsenceRequestStatus, AbsenceType, VacationStatus } from "@prisma/client";

function formatBerlinDateShort(d: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Berlin",
  }).format(d);
}
import {
  berlinDateKeyToDayOfWeek,
  countBerlinCalendarDaysInclusive,
  getBerlinDayBoundsUtc,
  listBerlinDateKeysInclusive,
} from "@/lib/time/timezone";
import { removeShiftsForApprovedAbsenceRange } from "@/lib/planning/absence-shift-sync";
import { sickAttachmentRetainUntil } from "@/lib/sick-attachment";

export type VacationConflictDay = {
  userId: string;
  /** Kalendertag Europe/Berlin (YYYY-MM-DD). */
  isoDate: string;
  type: "VACATION" | "SICK";
  /** Wochentag 0=So … 6=Sa — für Legacy-Board-Helfer. */
  dayOfWeek: number;
};

export async function requestVacation(data: {
  startDate: Date;
  endDate: Date;
  reason?: string;
}) {
  const { userId, companyId } = await requireTenant();
  const startBounds = getBerlinDayBoundsUtc(data.startDate);
  const endBounds = getBerlinDayBoundsUtc(data.endDate);
  const normalizedStartDate = startBounds.start;
  const normalizedEndDate = endBounds.end;
  const days = countBerlinCalendarDaysInclusive(normalizedStartDate, normalizedEndDate);

  const request = await db.vacationRequest.create({
    data: {
      companyId,
      userId,
      absenceType: AbsenceType.VACATION,
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      days,
      reason: data.reason,
    },
  });
  await db.absence.create({
    data: {
      userId,
      orgId: companyId,
      type: AbsenceType.VACATION,
      start: normalizedStartDate,
      end: normalizedEndDate,
      status: AbsenceRequestStatus.REQUESTED,
      reason: data.reason,
      sourceVacationRequestId: request.id,
    },
  });

  revalidatePath("/dashboard/vacation");
  revalidatePath("/dashboard/planning");
  return request;
}

export async function requestSickLeave(data: {
  startDate: Date;
  endDate: Date;
  note?: string;
  attachment?: { mime: string; dataUrl: string } | null;
}) {
  const { userId, companyId } = await requireTenant();
  const startBounds = getBerlinDayBoundsUtc(data.startDate);
  const endBounds = getBerlinDayBoundsUtc(data.endDate);
  const normalizedStartDate = startBounds.start;
  const normalizedEndDate = endBounds.end;
  const days = countBerlinCalendarDaysInclusive(normalizedStartDate, normalizedEndDate);

  const uploadedAt = data.attachment ? new Date() : null;

  const request = await db.vacationRequest.create({
    data: {
      companyId,
      userId,
      absenceType: AbsenceType.SICK,
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      days,
      status: VacationStatus.APPROVED,
      approvedAt: new Date(),
      reason: data.note?.trim() || null,
      sickAttachmentMime: data.attachment?.mime ?? null,
      sickAttachmentData: data.attachment?.dataUrl ?? null,
      sickAttachmentUploadedAt: uploadedAt,
      sickAttachmentRetainUntil: uploadedAt ? sickAttachmentRetainUntil(uploadedAt) : null,
    },
  });
  await db.absence.create({
    data: {
      userId,
      orgId: companyId,
      type: AbsenceType.SICK,
      start: normalizedStartDate,
      end: normalizedEndDate,
      status: AbsenceRequestStatus.APPROVED,
      reason: data.note?.trim() || null,
      sourceVacationRequestId: request.id,
      reviewedById: userId,
      reviewedAt: new Date(),
    },
  });

  const shiftsRemoved = await removeShiftsForApprovedAbsenceRange({
    companyId,
    userId,
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
  });

  revalidatePath("/dashboard/vacation");
  revalidatePath("/dashboard/planning");
  return { request, shiftsRemoved };
}

export async function approveVacation(requestId: string, opts?: { note?: string }) {
  const { userId, companyId, role } = await requireTenant();

  if (role !== "COMPANY_OWNER" && role !== "MANAGER" && role !== "SUPER_ADMIN") {
    throw new Error("Keine Berechtigung");
  }

  const request = await db.vacationRequest.findFirst({
    where: tenantWhere(companyId, { id: requestId }),
  });

  if (!request) throw new Error("Antrag nicht gefunden");
  if (request.status !== VacationStatus.PENDING) {
    throw new Error("Antrag wurde bereits bearbeitet.");
  }

  const noteStored = opts?.note?.trim() || null;

  const updated = await db.vacationRequest.update({
    where: { id: requestId },
    data: {
      status: "APPROVED",
      approvedById: userId,
      approvedAt: new Date(),
      decisionNote: noteStored,
    },
    include: {
      user: { select: { name: true, email: true } },
      approvedBy: { select: { name: true } },
    },
  });
  await db.absence.updateMany({
    where: { sourceVacationRequestId: requestId },
    data: {
      status: AbsenceRequestStatus.APPROVED,
      reviewedById: userId,
      reviewedAt: new Date(),
    },
  });

  await sendVacationStatusEmail({
    recipientName: updated.user.name ?? updated.user.email,
    recipientEmail: updated.user.email,
    status: "APPROVED",
    startDate: updated.startDate,
    endDate: updated.endDate,
    days: updated.days,
    approvedByName: updated.approvedBy?.name ?? "Manager",
    decisionNote: noteStored ?? undefined,
  });

  await createNotification({
    companyId,
    userId: updated.userId,
    type: "VACATION_APPROVED",
    title: "Urlaub genehmigt",
    body: `${formatBerlinDateShort(updated.startDate)}–${formatBerlinDateShort(updated.endDate)} (${updated.days} Tag${updated.days === 1 ? "" : "e"})${noteStored ? ` · Hinweis: ${noteStored}` : ""}`,
    href: "/dashboard/vacation",
  });

  await removeShiftsForApprovedAbsenceRange({
    companyId,
    userId: updated.userId,
    startDate: updated.startDate,
    endDate: updated.endDate,
  });

  revalidatePath("/dashboard/vacation");
  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard");
  return updated;
}

export async function rejectVacation(requestId: string, opts: { note: string }) {
  const { userId, companyId, role } = await requireTenant();

  if (role !== "COMPANY_OWNER" && role !== "MANAGER" && role !== "SUPER_ADMIN") {
    throw new Error("Keine Berechtigung");
  }

  const trimmed = opts?.note?.trim() ?? "";
  if (trimmed.length < 3) {
    throw new Error("Bitte mindestens eine kurze Begründung für die Ablehnung angeben (≥ 3 Zeichen).");
  }

  const request = await db.vacationRequest.findFirst({
    where: tenantWhere(companyId, { id: requestId }),
  });

  if (!request) throw new Error("Antrag nicht gefunden");
  if (request.status !== VacationStatus.PENDING) {
    throw new Error("Antrag wurde bereits bearbeitet.");
  }

  const updated = await db.vacationRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      approvedById: userId,
      approvedAt: new Date(),
      decisionNote: trimmed,
    },
    include: {
      user: { select: { name: true, email: true } },
      approvedBy: { select: { name: true } },
    },
  });
  await db.absence.updateMany({
    where: { sourceVacationRequestId: requestId },
    data: {
      status: AbsenceRequestStatus.REJECTED,
      reviewedById: userId,
      reviewedAt: new Date(),
    },
  });

  await sendVacationStatusEmail({
    recipientName: updated.user.name ?? updated.user.email,
    recipientEmail: updated.user.email,
    status: "REJECTED",
    startDate: updated.startDate,
    endDate: updated.endDate,
    days: updated.days,
    approvedByName: updated.approvedBy?.name ?? "Manager",
    decisionNote: trimmed,
  });

  await createNotification({
    companyId,
    userId: updated.userId,
    type: "VACATION_REJECTED",
    title: "Urlaub abgelehnt",
    body: `${formatBerlinDateShort(updated.startDate)}–${formatBerlinDateShort(updated.endDate)} · Begründung: ${trimmed}`,
    href: "/dashboard/vacation",
  });

  revalidatePath("/dashboard/vacation");
  revalidatePath("/dashboard");
  return updated;
}

export async function getMyVacationRequests() {
  const { userId, companyId } = await requireTenant();

  return db.vacationRequest.findMany({
    where: tenantWhere(companyId, { userId }),
    orderBy: { createdAt: "desc" },
    include: { approvedBy: { select: { name: true } } },
  });
}

export async function getAllVacationRequests() {
  const { companyId, role } = await requireTenant();

  if (role !== "COMPANY_OWNER" && role !== "MANAGER" && role !== "SUPER_ADMIN") {
    throw new Error("Keine Berechtigung");
  }

  return db.vacationRequest.findMany({
    where: tenantWhere(companyId),
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      approvedBy: { select: { name: true } },
    },
  });
}

export type VacationDecisionContext = {
  vacationDays: number;
  daysTakenThisYear: number;
  daysRemaining: number;
  conflicts: Array<{
    userId: string;
    name: string;
    staffingRole: string | null;
    type: "VACATION" | "SICK" | "OTHER";
    sameRole: boolean;
  }>;
};

/**
 * Liefert Team-Anträge inkl. Entscheidungs-Kontext: Resturlaub des Antragstellers
 * im Jahr des Antrags + Liste der Kolleg:innen, die im selben Zeitraum bereits
 * abwesend sind. Damit kann der Chef ohne Excel-Wechsel sicher entscheiden.
 */
export async function getTeamVacationRequestsWithContext() {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung");
  }

  const requests = await db.vacationRequest.findMany({
    where: tenantWhere(companyId),
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      user: { select: { id: true, name: true, email: true, vacationDays: true, staffingRole: true } },
      approvedBy: { select: { name: true } },
    },
  });

  const requesterIds = Array.from(new Set(requests.map((r) => r.userId)));
  if (requesterIds.length === 0) return [] as Array<typeof requests[number] & { context: VacationDecisionContext }>;

  // ── (1) Resturlaub pro (userId, year) – EIN Query, danach in Memory bucketn.
  // Spannweite umfasst alle Antrags-Jahre, damit auch ältere Anträge korrekt
  // dargestellt werden.
  const requestYears = requests.map((r) => new Date(r.startDate).getFullYear());
  const minYear = Math.min(...requestYears);
  const maxYear = Math.max(...requestYears);
  const yearRangeStart = new Date(Date.UTC(minYear, 0, 1));
  const yearRangeEnd = new Date(Date.UTC(maxYear + 1, 0, 1));

  const approvedVacationsForBuckets = await db.vacationRequest.findMany({
    where: tenantWhere(companyId, {
      userId: { in: requesterIds },
      status: VacationStatus.APPROVED,
      absenceType: AbsenceType.VACATION,
      startDate: { gte: yearRangeStart, lt: yearRangeEnd },
    }),
    select: { userId: true, startDate: true, days: true },
  });

  const requestsByUserYear = new Map<string, number>();
  for (const row of approvedVacationsForBuckets) {
    const year = new Date(row.startDate).getFullYear();
    const key = `${row.userId}:${year}`;
    requestsByUserYear.set(key, (requestsByUserYear.get(key) ?? 0) + row.days);
  }

  // ── (2) Konflikte: EIN Query pro Tabelle über die Hüllen-Zeitspanne aller
  // PENDING-Anträge; danach im Speicher pro Request matchen.
  const pendingRequests = requests.filter((r) => r.status === VacationStatus.PENDING);

  type OverlappingVacationRow = {
    id: string;
    userId: string;
    startDate: Date;
    endDate: Date;
    absenceType: AbsenceType;
    user: { name: string | null; email: string; staffingRole: string | null };
  };
  type OverlappingAbsenceRow = {
    id: string;
    userId: string;
    start: Date;
    end: Date;
    type: AbsenceType;
    user: { name: string | null; email: string; staffingRole: string | null };
  };
  let overlappingVacations: OverlappingVacationRow[] = [];
  let overlappingAbsences: OverlappingAbsenceRow[] = [];

  if (pendingRequests.length > 0) {
    let envelopeStart = pendingRequests[0].startDate;
    let envelopeEnd = pendingRequests[0].endDate;
    for (const r of pendingRequests) {
      if (r.startDate < envelopeStart) envelopeStart = r.startDate;
      if (r.endDate > envelopeEnd) envelopeEnd = r.endDate;
    }

    [overlappingVacations, overlappingAbsences] = await Promise.all([
      db.vacationRequest.findMany({
        where: tenantWhere(companyId, {
          status: VacationStatus.APPROVED,
          startDate: { lte: envelopeEnd },
          endDate: { gte: envelopeStart },
        }),
        select: {
          id: true,
          userId: true,
          startDate: true,
          endDate: true,
          absenceType: true,
          user: { select: { name: true, email: true, staffingRole: true } },
        },
      }),
      db.absence.findMany({
        where: {
          orgId: companyId,
          status: AbsenceRequestStatus.APPROVED,
          start: { lte: envelopeEnd },
          end: { gte: envelopeStart },
        },
        select: {
          id: true,
          userId: true,
          start: true,
          end: true,
          type: true,
          user: { select: { name: true, email: true, staffingRole: true } },
        },
      }),
    ]);
  }

  const enriched = requests.map((req) => {
    const year = new Date(req.startDate).getFullYear();
    const taken = requestsByUserYear.get(`${req.userId}:${year}`) ?? 0;
    const remaining = req.user.vacationDays - taken;

    let conflicts: VacationDecisionContext["conflicts"] = [];
    if (req.status === VacationStatus.PENDING) {
      const dedup = new Map<string, VacationDecisionContext["conflicts"][number]>();
      const pushOne = (entry: VacationDecisionContext["conflicts"][number]) => {
        const existing = dedup.get(entry.userId);
        if (!existing || entry.type === "SICK") {
          dedup.set(entry.userId, entry);
        }
      };
      for (const o of overlappingVacations) {
        if (o.userId === req.userId || o.id === req.id) continue;
        if (o.startDate > req.endDate || o.endDate < req.startDate) continue;
        const t: "VACATION" | "SICK" | "OTHER" =
          o.absenceType === AbsenceType.SICK ? "SICK" : o.absenceType === AbsenceType.VACATION ? "VACATION" : "OTHER";
        pushOne({
          userId: o.userId,
          name: o.user.name ?? o.user.email,
          staffingRole: o.user.staffingRole ?? null,
          type: t,
          sameRole: Boolean(req.user.staffingRole) && o.user.staffingRole === req.user.staffingRole,
        });
      }
      for (const o of overlappingAbsences) {
        if (o.userId === req.userId) continue;
        if (o.start > req.endDate || o.end < req.startDate) continue;
        const t: "VACATION" | "SICK" | "OTHER" =
          o.type === AbsenceType.SICK ? "SICK" : o.type === AbsenceType.VACATION ? "VACATION" : "OTHER";
        pushOne({
          userId: o.userId,
          name: o.user.name ?? o.user.email,
          staffingRole: o.user.staffingRole ?? null,
          type: t,
          sameRole: Boolean(req.user.staffingRole) && o.user.staffingRole === req.user.staffingRole,
        });
      }
      conflicts = Array.from(dedup.values())
        .sort((a, b) => Number(b.sameRole) - Number(a.sameRole))
        .slice(0, 20);
    }

    const context: VacationDecisionContext = {
      vacationDays: req.user.vacationDays,
      daysTakenThisYear: taken,
      daysRemaining: remaining,
      conflicts,
    };
    return Object.assign(req, { context });
  });

  return enriched;
}

/** Planer-RSC: companyId aus Session — kein requireTenant/redirect. */
export async function getVacationConflictDaysForCompany(companyId: string): Promise<VacationConflictDay[]> {
  const now = new Date();
  const horizonEnd = new Date(now);
  horizonEnd.setDate(horizonEnd.getDate() + 365);
  const nowStart = getBerlinDayBoundsUtc(now).start;
  const horizonEndDay = getBerlinDayBoundsUtc(horizonEnd).end;

  const requests = await db.vacationRequest.findMany({
    where: tenantWhere(companyId, {
      status: VacationStatus.APPROVED,
      endDate: { gte: nowStart },
      startDate: { lte: horizonEndDay },
    }),
    select: {
      userId: true,
      startDate: true,
      endDate: true,
      absenceType: true,
    },
  });
  const absences = await db.absence.findMany({
    where: {
      orgId: companyId,
      status: AbsenceRequestStatus.APPROVED,
      end: { gte: nowStart },
      start: { lte: horizonEndDay },
    },
    select: {
      userId: true,
      start: true,
      end: true,
      type: true,
    },
  });

  const conflicts = new Map<string, "VACATION" | "SICK">();
  const conflictKey = (userId: string, isoDate: string) => JSON.stringify([userId, isoDate]);

  const markRange = (
    userId: string,
    start: Date,
    end: Date,
    conflictType: "VACATION" | "SICK",
  ) => {
    for (const dateKey of listBerlinDateKeysInclusive(start, end)) {
      const key = conflictKey(userId, dateKey);
      const existing = conflicts.get(key);
      if (existing !== "SICK") {
        conflicts.set(key, conflictType);
      }
    }
  };

  for (const req of requests) {
    const conflictType: "VACATION" | "SICK" =
      req.absenceType === AbsenceType.SICK ? "SICK" : "VACATION";
    markRange(req.userId, req.startDate, req.endDate, conflictType);
  }
  for (const req of absences) {
    const conflictType: "VACATION" | "SICK" = req.type === AbsenceType.SICK ? "SICK" : "VACATION";
    markRange(req.userId, req.start, req.end, conflictType);
  }

  return Array.from(conflicts.entries())
    .map(([entry, type]) => {
      try {
        const parsed = JSON.parse(entry) as unknown;
        if (!Array.isArray(parsed) || parsed.length !== 2) return null;
        const [userId, isoDate] = parsed;
        if (typeof userId !== "string" || !userId) return null;
        if (typeof isoDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
        return {
          userId,
          isoDate,
          type,
          dayOfWeek: berlinDateKeyToDayOfWeek(isoDate),
        };
      } catch {
        return null;
      }
    })
    .filter((x): x is VacationConflictDay => x != null);
}

export async function getVacationConflictDaysForPlanning() {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) return [];
  return getVacationConflictDaysForCompany(companyId);
}
