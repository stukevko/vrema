"use server";

import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import { revalidatePath } from "next/cache";
import { calculateDistance } from "@/lib/geo";
import type { CorrectionRequestStatus, EntryStatus } from "@prisma/client";
import { getWeekCycleIndex } from "@/lib/shift-cycle";

const LATE_GRACE_MINUTES = 15;

function parseShiftTimeToDate(baseDate: Date, hhmm: string) {
  const [hRaw, mRaw] = hhmm.split(":");
  const hours = Number(hRaw);
  const minutes = Number(mRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const parsed = new Date(baseDate);
  parsed.setHours(hours, minutes, 0, 0);
  return parsed;
}

async function createClockInEntry(params: {
  companyId: string;
  userId: string;
  role: string;
  latitude?: number;
  longitude?: number;
}) {
  const { companyId, userId, role, latitude, longitude } = params;
  // Check if already clocked in
  const active = await db.workLog.findFirst({
    where: tenantWhere(companyId, { userId, clockOut: null }),
  });

  if (active) throw new Error("Bereits eingestempelt");

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { plan: true, geoRadiusMeters: true, geoLatitude: true, geoLongitude: true, shiftCycleWeeks: true },
  });
  if (!company) throw new Error("Firma nicht gefunden");

  const isAdmin = ["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role);
  const gpsProvided = typeof latitude === "number" && typeof longitude === "number";
  if (company.plan === "BUSINESS" && !isAdmin && !gpsProvided) {
    throw new Error("Business-Plan erfordert GPS beim Einstempeln.");
  }

  let isOutOfRange = false;
  let distanceMeters: number | null = null;
  let warning: string | null = null;

  if (gpsProvided && typeof company.geoLatitude === "number" && typeof company.geoLongitude === "number") {
    distanceMeters = Math.round(
      calculateDistance(latitude as number, longitude as number, company.geoLatitude, company.geoLongitude)
    );
    const geoRadiusMeters = company.geoRadiusMeters ?? 100;
    if (distanceMeters > geoRadiusMeters) {
      isOutOfRange = true;
      warning = "Achtung: Standort liegt außerhalb des erlaubten Radius.";
    }
  }

  if (company.plan === "BUSINESS" && !isAdmin && isOutOfRange) {
    throw new Error("Business-Plan: Einstempeln nur innerhalb des definierten GPS-Radius.");
  }

  const now = new Date();
  const weekIndex = getWeekCycleIndex(now, company.shiftCycleWeeks);
  const dayOfWeek = now.getDay();
  const shift = await db.shift.findFirst({
    where: tenantWhere(companyId, { userId, dayOfWeek, weekIndex }),
    orderBy: { startTime: "asc" },
    select: { startTime: true, endTime: true },
  });

  let status: EntryStatus = "ON_TIME";
  let extraShiftNote: string | null = null;
  if (shift) {
    const shiftStart = parseShiftTimeToDate(now, shift.startTime);
    if (shiftStart) {
      const diffMins = Math.round((now.getTime() - shiftStart.getTime()) / 60000);
      if (diffMins > LATE_GRACE_MINUTES) status = "LATE";
    }
  } else {
    // No planned shift today -> keep ON_TIME but mark for reporting context.
    extraShiftNote = "[EXTRA_SHIFT] Kein geplanter Schichtslot gefunden.";
  }

  const log = await db.workLog.create({
    data: {
      companyId,
      userId,
      clockIn: now,
      latitude,
      longitude,
      isOutOfRange,
      distanceMeters,
      status,
      ...(extraShiftNote ? { note: extraShiftNote } : {}),
    },
  });

  return { log, warning, isOutOfRange };
}

export async function clockIn(latitude?: number, longitude?: number) {
  const { userId, companyId, role } = await requireTenant();
  const result = await createClockInEntry({ companyId, userId, role, latitude, longitude });
  revalidatePath("/dashboard");
  return result;
}

async function closeClockForUser(params: {
  companyId: string;
  userId: string;
  logId?: string;
}) {
  const { companyId, userId, logId } = params;
  const active = logId
    ? await db.workLog.findFirst({ where: tenantWhere(companyId, { id: logId, userId }) })
    : await db.workLog.findFirst({ where: tenantWhere(companyId, { userId, clockOut: null }) });

  if (!active) throw new Error("Kein aktiver Stempel gefunden");

  const now = new Date();
  let nextBreakMins = active.breakMins;
  if (active.isOnBreak && active.breakStartedAt) {
    const extraBreak = Math.max(
      0,
      Math.round((now.getTime() - active.breakStartedAt.getTime()) / 60000)
    );
    nextBreakMins += extraBreak;
  }

  const updated = await db.workLog.update({
    where: { id: active.id },
    data: {
      clockOut: now,
      breakMins: nextBreakMins,
      isOnBreak: false,
      breakStartedAt: null,
    },
  });

  return updated;
}

export async function clockOut(logId?: string) {
  const { userId, companyId } = await requireTenant();
  const updated = await closeClockForUser({ companyId, userId, logId });
  revalidatePath("/dashboard");
  return updated;
}

export async function toggleBreak(logId?: string) {
  const { userId, companyId } = await requireTenant();

  const active = logId
    ? await db.workLog.findFirst({
        where: tenantWhere(companyId, { id: logId, userId, clockOut: null }),
      })
    : await db.workLog.findFirst({ where: tenantWhere(companyId, { userId, clockOut: null }) });

  if (!active) throw new Error("Kein aktiver Stempel gefunden");

  const now = new Date();
  const isStartingBreak = !active.isOnBreak;

  let nextBreakMins = active.breakMins;
  let nextBreakStartedAt: Date | null = now;
  if (!isStartingBreak) {
    if (active.breakStartedAt) {
      const breakDiff = Math.max(
        0,
        Math.round((now.getTime() - active.breakStartedAt.getTime()) / 60000)
      );
      nextBreakMins += breakDiff;
    }
    nextBreakStartedAt = null;
  }

  const updated = await db.workLog.update({
    where: { id: active.id },
    data: {
      breakMins: nextBreakMins,
      isOnBreak: isStartingBreak,
      breakStartedAt: nextBreakStartedAt,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reports");
  return {
    log: updated,
    status: isStartingBreak ? "break_started" : "break_ended",
  };
}

export async function updateWorkLogByManager(params: {
  logId: string;
  clockIn?: string;
  clockOut?: string | null;
  breakMins?: number;
  note?: string | null;
  status?: EntryStatus;
  editReason?: string | null;
}) {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const existing = await db.workLog.findFirst({
    where: tenantWhere(companyId, { id: params.logId }),
    select: { id: true },
  });
  if (!existing) throw new Error("Eintrag nicht gefunden.");

  const data: {
    clockIn?: Date;
    clockOut?: Date | null;
    breakMins?: number;
    note?: string | null;
    status?: EntryStatus;
  } = {};
  const clockIn = params.clockIn ? new Date(params.clockIn) : null;
  const clockOut = params.clockOut ? new Date(params.clockOut) : params.clockOut === null ? null : undefined;
  if (clockIn && Number.isNaN(clockIn.getTime())) throw new Error("Ungültige Einstempelzeit.");
  if (clockOut instanceof Date && Number.isNaN(clockOut.getTime())) throw new Error("Ungültige Ausstempelzeit.");
  if (clockIn && clockOut instanceof Date && clockOut <= clockIn) {
    throw new Error("Ausstempelzeit muss nach Einstempelzeit liegen.");
  }
  if (clockIn) data.clockIn = clockIn;
  if (clockOut !== undefined) data.clockOut = clockOut;
  if (typeof params.breakMins === "number") {
    data.breakMins = Math.max(0, Math.min(480, Math.floor(params.breakMins)));
  }
  if (params.note !== undefined) {
    const baseNote = params.note?.trim() ? params.note.trim() : "";
    const reasonPart = params.editReason?.trim() ? `[MANAGER_EDIT:${params.editReason.trim()}]` : "[MANAGER_EDIT]";
    data.note = [baseNote, reasonPart].filter(Boolean).join(" | ");
  }
  if (params.status !== undefined) {
    data.status = params.status;
  }

  const updated = await db.workLog.update({
    where: { id: params.logId },
    data,
  });

  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");
  return updated;
}

export async function deleteWorkLogByManager(logId: string) {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const existing = await db.workLog.findFirst({
    where: tenantWhere(companyId, { id: logId }),
    select: { id: true },
  });
  if (!existing) throw new Error("Eintrag nicht gefunden.");

  await db.workLog.delete({ where: { id: logId } });
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");
}

export async function toggleClockForUser(params: {
  companyId: string;
  userId: string;
  role?: string;
  latitude?: number;
  longitude?: number;
}) {
  const active = await db.workLog.findFirst({
    where: tenantWhere(params.companyId, { userId: params.userId, clockOut: null }),
    select: { id: true },
  });

  if (active) {
    const log = await closeClockForUser({
      companyId: params.companyId,
      userId: params.userId,
      logId: active.id,
    });
    return { type: "clock_out" as const, log, warning: null };
  }

  const result = await createClockInEntry({
    companyId: params.companyId,
    userId: params.userId,
    role: params.role ?? "EMPLOYEE",
    latitude: params.latitude,
    longitude: params.longitude,
  });

  return { type: "clock_in" as const, ...result };
}

export async function getMonthlyWorkLogs(year: number, month: number, targetUserId?: string) {
  const { userId, companyId } = await requireTenant();

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  return db.workLog.findMany({
    where: tenantWhere(companyId, {
      userId: targetUserId ?? userId,
      clockIn: { gte: start, lte: end },
    }),
    orderBy: { clockIn: "desc" },
  });
}

export async function calculateSaldoForUser(companyId: string, userId: string) {
  const user = await db.user.findFirst({
    where: tenantWhere(companyId, { id: userId }),
    select: { weeklyHours: true },
  });

  if (!user) throw new Error("User not found");

  // Get all completed work logs
  const logs = await db.workLog.findMany({
    where: tenantWhere(companyId, { userId, clockOut: { not: null } }),
  });

  // Total worked minutes
  const workedMinutes = logs.reduce((acc, log) => {
    const diff = (log.clockOut!.getTime() - log.clockIn.getTime()) / 1000 / 60;
    return acc + diff - log.breakMins;
  }, 0);

  // Calculate expected minutes based on weeks elapsed since first log
  const firstLog = logs[0]?.clockIn;
  if (!firstLog) return { workedMinutes: 0, expectedMinutes: 0, saldoMinutes: 0 };

  const weeksSinceStart =
    (Date.now() - firstLog.getTime()) / (1000 * 60 * 60 * 24 * 7);
  const expectedMinutes = weeksSinceStart * user.weeklyHours * 60;

  return {
    workedMinutes: Math.round(workedMinutes),
    expectedMinutes: Math.round(expectedMinutes),
    saldoMinutes: Math.round(workedMinutes - expectedMinutes),
  };
}

/**
 * Calculate Saldo (balance of worked hours vs. scheduled hours).
 * Returns difference in minutes (positive = Überstunden, negative = Minusstunden).
 */
export async function calculateSaldo(targetUserId?: string) {
  const { userId, companyId } = await requireTenant();
  return calculateSaldoForUser(companyId, targetUserId ?? userId);
}

export async function createWorkLogCorrectionRequest(input: {
  workLogId?: string;
  requestedClockIn: string;
  requestedClockOut?: string | null;
  requestedBreakMins?: number;
  requestedNote?: string | null;
  reason: string;
}) {
  const { userId, companyId } = await requireTenant();
  const reason = input.reason.trim();
  if (!reason) throw new Error("Bitte Begründung angeben.");

  const requestedClockIn = new Date(input.requestedClockIn);
  if (Number.isNaN(requestedClockIn.getTime())) throw new Error("Ungültige Einstempelzeit.");
  const requestedClockOut = input.requestedClockOut ? new Date(input.requestedClockOut) : null;
  if (requestedClockOut && Number.isNaN(requestedClockOut.getTime())) throw new Error("Ungültige Ausstempelzeit.");
  if (requestedClockOut && requestedClockOut <= requestedClockIn) {
    throw new Error("Ausstempelzeit muss nach Einstempelzeit liegen.");
  }
  const requestedBreakMins = Math.max(0, Math.min(480, Math.floor(input.requestedBreakMins ?? 0)));

  let workLogId: string | undefined;
  if (input.workLogId) {
    const existing = await db.workLog.findFirst({
      where: tenantWhere(companyId, { id: input.workLogId, userId }),
      select: { id: true },
    });
    if (!existing) throw new Error("Eintrag nicht gefunden.");
    workLogId = existing.id;
  }

  const request = await db.workLogCorrectionRequest.create({
    data: {
      companyId,
      userId,
      workLogId,
      requestedClockIn,
      requestedClockOut,
      requestedBreakMins,
      requestedNote: input.requestedNote?.trim() || null,
      reason,
    },
  });

  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");
  return request;
}

export async function getMyWorkLogCorrectionRequests() {
  const { userId, companyId } = await requireTenant();
  return db.workLogCorrectionRequest.findMany({
    where: tenantWhere(companyId, { userId }),
    orderBy: { createdAt: "desc" },
    include: { reviewedBy: { select: { name: true, email: true } } },
  });
}

export async function getCompanyWorkLogCorrectionRequests(status?: CorrectionRequestStatus) {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) return [];
  return db.workLogCorrectionRequest.findMany({
    where: tenantWhere(companyId, status ? { status } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
    },
  });
}

export async function decideWorkLogCorrectionRequest(input: {
  requestId: string;
  decision: "APPROVE" | "REJECT";
  reviewerNote?: string | null;
}) {
  const { companyId, userId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }
  const req = await db.workLogCorrectionRequest.findFirst({
    where: tenantWhere(companyId, { id: input.requestId }),
  });
  if (!req) throw new Error("Antrag nicht gefunden.");
  if (req.status !== "PENDING") throw new Error("Antrag wurde bereits bearbeitet.");

  if (input.decision === "REJECT") {
    const rejected = await db.workLogCorrectionRequest.update({
      where: { id: req.id },
      data: {
        status: "REJECTED",
        reviewedById: userId,
        reviewedAt: new Date(),
        reviewerNote: input.reviewerNote?.trim() || null,
      },
    });
    revalidatePath("/dashboard/reports");
    return rejected;
  }

  await db.$transaction(async (tx) => {
    const noteParts = [req.requestedNote, `[REQUEST_APPROVED:${req.id}]`].filter(Boolean).join(" | ");
    if (req.workLogId) {
      await tx.workLog.update({
        where: { id: req.workLogId },
        data: {
          clockIn: req.requestedClockIn,
          clockOut: req.requestedClockOut,
          breakMins: req.requestedBreakMins,
          note: noteParts || null,
          status: "MANUAL_ADJUSTED",
        },
      });
    } else {
      await tx.workLog.create({
        data: {
          companyId: req.companyId,
          userId: req.userId,
          clockIn: req.requestedClockIn,
          clockOut: req.requestedClockOut,
          breakMins: req.requestedBreakMins,
          note: noteParts || `[REQUEST_APPROVED:${req.id}]`,
          status: "MANUAL_ADJUSTED",
        },
      });
    }
    await tx.workLogCorrectionRequest.update({
      where: { id: req.id },
      data: {
        status: "APPROVED",
        reviewedById: userId,
        reviewedAt: new Date(),
        reviewerNote: input.reviewerNote?.trim() || null,
      },
    });
  });

  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");
  return { ok: true };
}
