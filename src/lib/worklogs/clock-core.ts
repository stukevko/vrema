import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import type { EntryStatus } from "@prisma/client";
import { getWeekCycleIndex } from "@/lib/shift-cycle";
import { generateTaskListForShiftCore } from "@/lib/shift-tasks/generate-task-list";
import { randomUUID } from "crypto";
import { parseBerlinShiftStart, getBerlinDateKey, berlinDateKeyToDayOfWeek } from "@/lib/time/timezone";
import { finalizeBreakMinutesOnClose } from "@/lib/time/auto-break";

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

/**
 * Baut den Schicht-Start als UTC-Datum auf, das dem Wandkalender in
 * `Europe/Berlin` entspricht. Vorher wurde `setHours` in der lokalen Node-TZ
 * verwendet – auf UTC-Servern führte das zu falsch berechneten Verspätungen.
 */
function parseShiftTimeToDate(baseDate: Date, hhmm: string) {
  return parseBerlinShiftStart(baseDate, hhmm);
}

export async function createClockInEntry(params: {
  companyId: string;
  userId: string;
  actorUserId?: string;
  /** Offline-Sync: ursprünglicher Client-Zeitstempel */
  clockInAt?: Date;
  source?: string;
}) {
  const { companyId, userId, actorUserId, clockInAt, source = "app" } = params;
  await ensureWorkLogOpenUniqueConstraint();
  await ensureWorkLogAuditTable();

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { shiftCycleWeeks: true },
  });
  if (!company) throw new Error("Firma nicht gefunden");

  const now = clockInAt ?? new Date();
  const weekIndex = getWeekCycleIndex(now, company.shiftCycleWeeks);
  // dayOfWeek strikt aus dem Berliner Wandkalender ableiten, damit der
  // Schicht-Lookup nicht von der Server-TZ abhängt (siehe Audit Task 16).
  const dayOfWeek = berlinDateKeyToDayOfWeek(getBerlinDateKey(now));
  const shift = await db.shift.findFirst({
    where: tenantWhere(companyId, { userId, dayOfWeek, weekIndex }),
    orderBy: { startTime: "asc" },
    select: { id: true, startTime: true, endTime: true },
  });

  let status: EntryStatus = "ON_TIME";
  let extraShiftNote: string | null = null;
  let lateMinutes = 0;
  if (shift) {
    const shiftStart = parseShiftTimeToDate(now, shift.startTime);
    if (shiftStart) {
      const diffMins = Math.round((now.getTime() - shiftStart.getTime()) / 60000);
      if (diffMins > LATE_GRACE_MINUTES) {
        status = "LATE";
        lateMinutes = diffMins;
      }
    }
  } else {
    extraShiftNote = "Nicht nach Zeitplan eingestempelt.";
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
      source,
      JSON.stringify(created)
    );
    return created;
  });

  if (shift?.id) {
    await generateTaskListForShiftCore({ companyId, shiftId: shift.id, templateUserId: userId }).catch(() => {
      /* Checklisten sind optional; Clock-In darf nicht fehlschlagen */
    });
  }

  // Kontextueller Hinweis fürs UI – das macht VREMA „smart" statt nur „funktioniert".
  // Vorrangig: Verspätung erwähnen (Mitarbeiter weiß meist selbst), bei Extra-Schicht
  // klar markieren (damit der MA versteht, dass das im Bericht auffällt).
  let warning: string | null = null;
  if (status === "LATE" && lateMinutes > 0) {
    warning = `Schicht-Start war vor ${lateMinutes} Min. Eintrag ist als „verspätet" markiert.`;
  } else if (extraShiftNote) {
    warning = "Heute ist keine Schicht für dich geplant – wurde als Extra-Schicht erfasst.";
  }

  return { log, warning };
}

export async function closeClockForUser(params: {
  companyId: string;
  userId: string;
  actorUserId?: string;
  logId?: string;
  clockOutAt?: Date;
  source?: string;
}) {
  const { companyId, userId, logId, actorUserId, clockOutAt, source = "app" } = params;
  await ensureWorkLogAuditTable();
  return db.$transaction(async (tx) => {
    const active = logId
      ? await tx.workLog.findFirst({ where: tenantWhere(companyId, { id: logId, userId, clockOut: null }) })
      : await tx.workLog.findFirst({ where: tenantWhere(companyId, { userId, clockOut: null }) });

    if (!active) throw new Error("Kein aktiver Stempel gefunden");

    const now = clockOutAt ?? new Date();
    let nextBreakMins = active.breakMins;
    if (active.isOnBreak && active.breakStartedAt) {
      const extraBreak = Math.max(0, Math.round((now.getTime() - active.breakStartedAt.getTime()) / 60000));
      nextBreakMins += extraBreak;
    }

    const finalized = finalizeBreakMinutesOnClose({
      clockIn: active.clockIn,
      clockOut: now,
      breakMins: nextBreakMins,
      note: active.note,
    });

    const updated = await tx.workLog.update({
      where: { id: active.id },
      data: {
        clockOut: now,
        breakMins: finalized.breakMins,
        note: finalized.note,
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
      source,
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
