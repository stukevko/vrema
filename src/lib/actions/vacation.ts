"use server";

import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import { revalidatePath } from "next/cache";
import { sendVacationStatusEmail } from "@/lib/actions/emails";
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
      absenceType: AbsenceType.SICK,
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      days,
      status: VacationStatus.APPROVED,
      approvedAt: new Date(),
      reason: data.note?.trim() || null,
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

  revalidatePath("/dashboard/vacation");
  revalidatePath("/dashboard/planning");
  return request;
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

  revalidatePath("/dashboard/vacation");
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

  // Resturlaub im Jahr des Antrags – pro (userId, year)
  const yearKeys = new Set<string>();
  const requestsByUserYear = new Map<string, number>(); // sum of approved VACATION days
  const yearRanges: Array<{ userId: string; year: number; start: Date; end: Date }> = [];
  for (const r of requests) {
    const year = new Date(r.startDate).getFullYear();
    const key = `${r.userId}:${year}`;
    if (yearKeys.has(key)) continue;
    yearKeys.add(key);
    yearRanges.push({
      userId: r.userId,
      year,
      start: new Date(Date.UTC(year, 0, 1)),
      end: new Date(Date.UTC(year + 1, 0, 1)),
    });
  }

  await Promise.all(
    yearRanges.map(async ({ userId, year, start, end }) => {
      const approved = await db.vacationRequest.findMany({
        where: tenantWhere(companyId, {
          userId,
          status: VacationStatus.APPROVED,
          absenceType: AbsenceType.VACATION,
          startDate: { gte: start, lt: end },
        }),
        select: { days: true },
      });
      const sum = approved.reduce((a, b) => a + b.days, 0);
      requestsByUserYear.set(`${userId}:${year}`, sum);
    })
  );

  // Konflikte je Antrag (nur PENDING wirklich relevant – aber wir
  // berechnen für alle, damit ältere Anträge ihre Historie zeigen).
  const enriched = await Promise.all(
    requests.map(async (req) => {
      const year = new Date(req.startDate).getFullYear();
      const taken = requestsByUserYear.get(`${req.userId}:${year}`) ?? 0;
      // Bei APPROVED-Eigenantrag ist `taken` inkl. dieses Antrags – Resturlaub stimmt direkt.
      // Bei PENDING ist `taken` ohne diesen Antrag – die UI zeigt den Effekt nach Freigabe separat an.
      const remaining = req.user.vacationDays - taken;

      let conflicts: VacationDecisionContext["conflicts"] = [];
      if (req.status === VacationStatus.PENDING) {
        const overlappingVacations = await db.vacationRequest.findMany({
          where: tenantWhere(companyId, {
            id: { not: req.id },
            userId: { not: req.userId },
            status: VacationStatus.APPROVED,
            startDate: { lte: req.endDate },
            endDate: { gte: req.startDate },
          }),
          select: {
            userId: true,
            absenceType: true,
            user: { select: { name: true, email: true, staffingRole: true } },
          },
          take: 20,
        });
        const overlappingAbsences = await db.absence.findMany({
          where: {
            orgId: companyId,
            userId: { not: req.userId },
            status: AbsenceRequestStatus.APPROVED,
            start: { lte: req.endDate },
            end: { gte: req.startDate },
          },
          select: {
            userId: true,
            type: true,
            user: { select: { name: true, email: true, staffingRole: true } },
          },
          take: 20,
        });

        const dedup = new Map<string, VacationDecisionContext["conflicts"][number]>();
        const pushOne = (entry: VacationDecisionContext["conflicts"][number]) => {
          const existing = dedup.get(entry.userId);
          if (!existing || entry.type === "SICK") {
            dedup.set(entry.userId, entry);
          }
        };
        for (const o of overlappingVacations) {
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
        conflicts = Array.from(dedup.values()).sort((a, b) => Number(b.sameRole) - Number(a.sameRole));
      }

      const context: VacationDecisionContext = {
        vacationDays: req.user.vacationDays,
        daysTakenThisYear: taken,
        daysRemaining: remaining,
        conflicts,
      };
      return Object.assign(req, { context });
    })
  );

  return enriched;
}

export async function getVacationConflictDaysForPlanning() {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) return [];

  const now = new Date();
  const horizonEnd = new Date(now);
  horizonEnd.setDate(horizonEnd.getDate() + 120);
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
  for (const req of requests) {
    const conflictType: "VACATION" | "SICK" = req.absenceType === AbsenceType.SICK ? "SICK" : "VACATION";
    const dateKeys = listBerlinDateKeysInclusive(req.startDate, req.endDate);
    for (const dateKey of dateKeys) {
      const key = `${req.userId}-${berlinDateKeyToDayOfWeek(dateKey)}`;
      const existing = conflicts.get(key);
      if (existing !== "SICK") {
        conflicts.set(key, conflictType);
      }
    }
  }
  for (const req of absences) {
    const conflictType: "VACATION" | "SICK" = req.type === AbsenceType.SICK ? "SICK" : "VACATION";
    const dateKeys = listBerlinDateKeysInclusive(req.start, req.end);
    for (const dateKey of dateKeys) {
      const key = `${req.userId}-${berlinDateKeyToDayOfWeek(dateKey)}`;
      const existing = conflicts.get(key);
      if (existing !== "SICK") {
        conflicts.set(key, conflictType);
      }
    }
  }

  return Array.from(conflicts.entries()).map(([entry, type]) => {
    const [userId, day] = entry.split("-");
    return { userId, dayOfWeek: Number(day), type };
  });
}
