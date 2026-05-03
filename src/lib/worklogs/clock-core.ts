import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import type { EntryStatus } from "@prisma/client";
import { getWeekCycleIndex } from "@/lib/shift-cycle";
import { randomUUID } from "crypto";

const LATE_GRACE_MINUTES = 15;
let constraintsEnsured = false;

export async function ensureWorkLogOpenUniqueConstraint() {
  if (constraintsEnsured) return;
  await db.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS "worklog_open_unique_idx" ON "WorkLog" ("companyId","userId") WHERE "clockOut" IS NULL'
  );
  constraintsEnsured = true;
}

let auditTableEnsured = false;
export async function ensureWorkLogAuditTable() {
  if (auditTableEnsured) return;
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WorkLogAudit" (
      "id" TEXT PRIMARY KEY,
      "companyId" TEXT NOT NULL,
      "workLogId" TEXT,
      "actorUserId" TEXT,
      "action" TEXT NOT NULL,
      "source" TEXT NOT NULL DEFAULT 'app',
      "reason" TEXT,
      "beforeJson" JSONB,
      "afterJson" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
    )
  `);
  auditTableEnsured = true;
}

export async function writeWorkLogAudit(params: {
  companyId: string;
  workLogId?: string | null;
  actorUserId?: string | null;
  action: string;
  source?: string;
  reason?: string | null;
  beforeJson?: unknown;
  afterJson?: unknown;
}) {
  await ensureWorkLogAuditTable();
  await db.$executeRawUnsafe(
    `
    INSERT INTO "WorkLogAudit"
      ("id","companyId","workLogId","actorUserId","action","source","reason","beforeJson","afterJson")
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb)
    `,
    randomUUID(),
    params.companyId,
    params.workLogId ?? null,
    params.actorUserId ?? null,
    params.action,
    params.source ?? "app",
    params.reason ?? null,
    params.beforeJson ? JSON.stringify(params.beforeJson) : null,
    params.afterJson ? JSON.stringify(params.afterJson) : null
  );
}

function parseShiftTimeToDate(baseDate: Date, hhmm: string) {
  const [hRaw, mRaw] = hhmm.split(":");
  const hours = Number(hRaw);
  const minutes = Number(mRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const parsed = new Date(baseDate);
  parsed.setHours(hours, minutes, 0, 0);
  return parsed;
}

export async function createClockInEntry(params: {
  companyId: string;
  userId: string;
  actorUserId?: string;
}) {
  const { companyId, userId, actorUserId } = params;
  await ensureWorkLogOpenUniqueConstraint();
  await ensureWorkLogAuditTable();

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { shiftCycleWeeks: true },
  });
  if (!company) throw new Error("Firma nicht gefunden");

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
    extraShiftNote = "[EXTRA_SHIFT] Kein geplanter Schichtslot gefunden.";
  }

  const log = await db.$transaction(async (tx) => {
    const active = await tx.workLog.findFirst({
      where: tenantWhere(companyId, { userId, clockOut: null }),
      select: { id: true },
    });
    if (active) throw new Error("Bereits eingestempelt");

    const created = await tx.workLog.create({
      data: {
        companyId,
        userId,
        clockIn: now,
        status,
        ...(extraShiftNote ? { note: extraShiftNote } : {}),
      },
    });
    await tx.$executeRawUnsafe(
      `
      INSERT INTO "WorkLogAudit"
        ("id","companyId","workLogId","actorUserId","action","source","afterJson")
      VALUES
        ($1,$2,$3,$4,$5,$6,$7::jsonb)
      `,
      randomUUID(),
      companyId,
      created.id,
      actorUserId ?? userId,
      "CLOCK_IN",
      "app",
      JSON.stringify(created)
    );
    return created;
  });

  return { log, warning: null as string | null };
}

export async function closeClockForUser(params: {
  companyId: string;
  userId: string;
  actorUserId?: string;
  logId?: string;
}) {
  const { companyId, userId, logId, actorUserId } = params;
  await ensureWorkLogAuditTable();
  return db.$transaction(async (tx) => {
    const active = logId
      ? await tx.workLog.findFirst({ where: tenantWhere(companyId, { id: logId, userId, clockOut: null }) })
      : await tx.workLog.findFirst({ where: tenantWhere(companyId, { userId, clockOut: null }) });

    if (!active) throw new Error("Kein aktiver Stempel gefunden");

    const now = new Date();
    let nextBreakMins = active.breakMins;
    if (active.isOnBreak && active.breakStartedAt) {
      const extraBreak = Math.max(0, Math.round((now.getTime() - active.breakStartedAt.getTime()) / 60000));
      nextBreakMins += extraBreak;
    }

    const updated = await tx.workLog.update({
      where: { id: active.id },
      data: {
        clockOut: now,
        breakMins: nextBreakMins,
        isOnBreak: false,
        breakStartedAt: null,
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
      actorUserId ?? userId,
      "CLOCK_OUT",
      "app",
      JSON.stringify(active),
      JSON.stringify(updated)
    );
    return updated;
  });
}

/** Nur Server (Terminal nach PIN-Check) — nicht als Server Action aus worklogs exportieren. */
export async function toggleClockForUser(params: { companyId: string; userId: string }) {
  await ensureWorkLogOpenUniqueConstraint();
  const active = await db.workLog.findFirst({
    where: tenantWhere(params.companyId, { userId: params.userId, clockOut: null }),
    select: { id: true },
  });

  if (active) {
    const log = await closeClockForUser({
      companyId: params.companyId,
      userId: params.userId,
      actorUserId: params.userId,
      logId: active.id,
    });
    return { type: "clock_out" as const, log, warning: null };
  }

  const result = await createClockInEntry({
    companyId: params.companyId,
    userId: params.userId,
    actorUserId: params.userId,
  });

  return { type: "clock_in" as const, ...result };
}
