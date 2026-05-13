"use server";

import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import { revalidatePath } from "next/cache";
import type { CorrectionRequestStatus, EntryStatus } from "@prisma/client";
import { calculateSaldoForUser } from "@/lib/time/saldo-for-user";
import { randomUUID } from "crypto";
import {
  closeClockForUser,
  createClockInEntry,
  ensureWorkLogAuditTable,
  writeWorkLogAudit,
} from "@/lib/worklogs/clock-core";
import { getMonthBoundsUtc } from "@/lib/time/timezone";
import { assertClockIpAllowed } from "@/lib/security/ip-allowlist-server";

export async function clockIn() {
  const { userId, companyId } = await requireTenant();
  // Enterprise: IP-Geofencing greift, falls die Firma "Stempeln nur am Standort" aktiv hat.
  await assertClockIpAllowed(companyId);
  const result = await createClockInEntry({ companyId, userId, actorUserId: userId });
  revalidatePath("/dashboard");
  return result;
}

export async function clockOut(logId?: string) {
  const { userId, companyId } = await requireTenant();
  const updated = await closeClockForUser({ companyId, userId, actorUserId: userId, logId });
  revalidatePath("/dashboard");
  return updated;
}

export async function toggleBreak(logId?: string) {
  const { userId, companyId } = await requireTenant();
  await ensureWorkLogAuditTable();
  const { updated, status } = await db.$transaction(async (tx) => {
    const active = logId
      ? await tx.workLog.findFirst({
          where: tenantWhere(companyId, { id: logId, userId, clockOut: null }),
        })
      : await tx.workLog.findFirst({ where: tenantWhere(companyId, { userId, clockOut: null }) });

    if (!active) throw new Error("Kein aktiver Stempel gefunden");

    const now = new Date();
    const isStartingBreak = !active.isOnBreak;

    let nextBreakMins = active.breakMins;
    let nextBreakStartedAt: Date | null = now;
    if (!isStartingBreak) {
      if (active.breakStartedAt) {
        const breakDiff = Math.max(0, Math.round((now.getTime() - active.breakStartedAt.getTime()) / 60000));
        nextBreakMins += breakDiff;
      }
      nextBreakStartedAt = null;
    }

    const updatedLog = await tx.workLog.update({
      where: { id: active.id },
      data: {
        breakMins: nextBreakMins,
        isOnBreak: isStartingBreak,
        breakStartedAt: nextBreakStartedAt,
      },
    });
    await tx.$executeRawUnsafe(
      `
      INSERT INTO "WorkLogAudit"
        ("id","companyId","workLogId","actorUserId","action","source","beforeJson","afterJson")
      VALUES
        ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)
      `,
      randomUUID(),
      companyId,
      active.id,
      userId,
      isStartingBreak ? "BREAK_START" : "BREAK_END",
      "app",
      JSON.stringify(active),
      JSON.stringify(updatedLog)
    );
    return { updated: updatedLog, status: isStartingBreak ? "break_started" : "break_ended" as const };
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reports");
  return {
    log: updated,
    status,
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
  const { companyId, role, userId: actorUserId } = await requireTenant();
  await ensureWorkLogAuditTable();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const existing = await db.workLog.findFirst({
    where: tenantWhere(companyId, { id: params.logId }),
    select: {
      id: true,
      companyId: true,
      userId: true,
      clockIn: true,
      clockOut: true,
      breakMins: true,
      status: true,
      note: true,
      isOnBreak: true,
      breakStartedAt: true,
    },
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
  const reason = params.editReason?.trim();
  if (!reason) {
    throw new Error("Grund der Änderung ist erforderlich.");
  }
  if (clockIn) data.clockIn = clockIn;
  if (clockOut !== undefined) data.clockOut = clockOut;
  if (typeof params.breakMins === "number") {
    data.breakMins = Math.max(0, Math.min(480, Math.floor(params.breakMins)));
  }
  if (params.note !== undefined) {
    const baseNote = params.note?.trim() ? params.note.trim() : "";
    const reasonPart = params.editReason?.trim()
      ? `[MANAGER-BEARBEITUNG: ${params.editReason.trim()}]`
      : "[MANAGER-BEARBEITUNG]";
    data.note = [baseNote, reasonPart].filter(Boolean).join(" | ");
  }
  if (params.status !== undefined) {
    data.status = params.status;
  }

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.workLog.update({
      where: { id: params.logId },
      data,
    });
    await tx.$executeRawUnsafe(
      `
      INSERT INTO "WorkLogAudit"
        ("id","companyId","workLogId","actorUserId","action","source","reason","beforeJson","afterJson")
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb)
      `,
      randomUUID(),
      companyId,
      params.logId,
      actorUserId,
      "MANAGER_UPDATE",
      "manager",
      reason,
      JSON.stringify(existing),
      JSON.stringify(row)
    );
    return row;
  });

  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");
  return updated;
}

export async function deleteWorkLogByManager(logId: string, deleteReason?: string) {
  const { companyId, role, userId: actorUserId } = await requireTenant();
  await ensureWorkLogAuditTable();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const existing = await db.workLog.findFirst({
    where: tenantWhere(companyId, { id: logId }),
    select: {
      id: true,
      companyId: true,
      userId: true,
      clockIn: true,
      clockOut: true,
      breakMins: true,
      status: true,
      note: true,
    },
  });
  if (!existing) throw new Error("Eintrag nicht gefunden.");
  const reason = deleteReason?.trim();
  if (!reason) throw new Error("Grund der Löschung ist erforderlich.");

  await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `
      INSERT INTO "WorkLogAudit"
        ("id","companyId","workLogId","actorUserId","action","source","reason","beforeJson")
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
      `,
      randomUUID(),
      companyId,
      logId,
      actorUserId,
      "MANAGER_DELETE",
      "manager",
      reason,
      JSON.stringify(existing)
    );
    await tx.workLog.delete({ where: { id: logId } });
  });
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");
}

export async function getMonthlyWorkLogs(year: number, month: number, targetUserId?: string) {
  const { userId, companyId, role } = await requireTenant();
  const target = targetUserId ?? userId;
  if (
    target !== userId &&
    !["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role ?? "")
  ) {
    throw new Error("Keine Berechtigung.");
  }

  const { start, endExclusive } = getMonthBoundsUtc(year, month, "Europe/Berlin");

  return db.workLog.findMany({
    where: tenantWhere(companyId, {
      userId: target,
      clockIn: { gte: start, lt: endExclusive },
    }),
    orderBy: { clockIn: "desc" },
  });
}

/**
 * Calculate Saldo (balance of worked hours vs. scheduled hours).
 * Returns difference in minutes (positive = Überstunden, negative = Minusstunden).
 */
export async function calculateSaldo(targetUserId?: string) {
  const { userId, companyId, role } = await requireTenant();
  const target = targetUserId ?? userId;
  if (
    target !== userId &&
    !["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role ?? "")
  ) {
    throw new Error("Keine Berechtigung.");
  }
  return calculateSaldoForUser(companyId, target);
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
  await ensureWorkLogAuditTable();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }
  const req = await db.workLogCorrectionRequest.findFirst({
    where: tenantWhere(companyId, { id: input.requestId }),
  });
  if (!req) throw new Error("Antrag nicht gefunden.");
  if (req.status !== "PENDING") throw new Error("Antrag wurde bereits bearbeitet.");

  if (input.decision === "REJECT") {
    const rejectNote = input.reviewerNote?.trim() ?? "";
    if (rejectNote.length < 3) {
      throw new Error("Bitte eine kurze Begründung für die Ablehnung angeben (≥ 3 Zeichen).");
    }
    const rejected = await db.workLogCorrectionRequest.update({
      where: { id: req.id },
      data: {
        status: "REJECTED",
        reviewedById: userId,
        reviewedAt: new Date(),
        reviewerNote: rejectNote,
      },
    });
    revalidatePath("/dashboard/reports");
    await writeWorkLogAudit({
      companyId,
      workLogId: req.workLogId ?? null,
      actorUserId: userId,
      action: "CORRECTION_REJECTED",
      source: "manager",
      reason: rejectNote || req.reason,
      beforeJson: req as unknown as object,
      afterJson: rejected as unknown as object,
    });
    return rejected;
  }

  await db.$transaction(async (tx) => {
    const noteParts = [req.requestedNote, `[REQUEST_APPROVED:${req.id}]`].filter(Boolean).join(" | ");
    if (req.workLogId) {
      // RLS-Defense: Doppelt absichern, dass der referenzierte WorkLog zur selben
      // Firma gehört. Schützt vor DB-Inkonsistenzen oder zukünftigen Bugs, wo der
      // CorrectionRequest künstlich mit fremden `workLogId` vermischt würde.
      const before = await tx.workLog.findFirst({
        where: tenantWhere(companyId, { id: req.workLogId }),
      });
      if (!before) throw new Error("Verknüpfter Zeiteintrag gehört nicht zu dieser Firma.");
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
      const after = await tx.workLog.findUnique({ where: { id: req.workLogId } });
      await tx.$executeRawUnsafe(
        `
        INSERT INTO "WorkLogAudit"
          ("id","companyId","workLogId","actorUserId","action","source","reason","beforeJson","afterJson")
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb)
        `,
        randomUUID(),
        companyId,
        req.workLogId,
        userId,
        "CORRECTION_APPROVED_UPDATE",
        "manager",
        req.reason,
        JSON.stringify(before),
        JSON.stringify(after)
      );
    } else {
      const created = await tx.workLog.create({
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
      await tx.$executeRawUnsafe(
        `
        INSERT INTO "WorkLogAudit"
          ("id","companyId","workLogId","actorUserId","action","source","reason","afterJson")
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
        `,
        randomUUID(),
        companyId,
        created.id,
        userId,
        "CORRECTION_APPROVED_CREATE",
        "manager",
        req.reason,
        JSON.stringify(created)
      );
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
