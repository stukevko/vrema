import type { PrismaClient } from "@prisma/client";
import { getWeekCycleIndex } from "@/lib/shift-cycle";
import { randomUUID } from "crypto";

function parseShiftTimeToDate(baseDate: Date, hhmm: string) {
  const [hRaw, mRaw] = hhmm.split(":");
  const hours = Number(hRaw);
  const minutes = Number(mRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const parsed = new Date(baseDate);
  parsed.setHours(hours, minutes, 0, 0);
  return parsed;
}

function getDayBounds(now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export type AbsentJobReport = {
  scannedShifts: number;
  createdAbsentEntries: number;
  skippedExistingEntries: number;
  skippedNotDueYet: number;
  executedAt: string;
};

export async function createAbsentEntriesForMissingShifts(prisma: PrismaClient): Promise<AbsentJobReport> {
  const now = new Date();
  const { start, end } = getDayBounds(now);
  const todayDow = now.getDay();

  const shifts = await prisma.shift.findMany({
    where: {
      dayOfWeek: todayDow,
      company: { isActive: true, plan: "BUSINESS" },
      user: { isActive: true },
    },
    select: {
      id: true,
      companyId: true,
      userId: true,
      weekIndex: true,
      startTime: true,
      endTime: true,
      company: { select: { shiftCycleWeeks: true } },
    },
  });

  let createdAbsentEntries = 0;
  let skippedExistingEntries = 0;
  let skippedNotDueYet = 0;

  for (const shift of shifts) {
    const currentWeekIndex = getWeekCycleIndex(now, shift.company.shiftCycleWeeks);
    if (shift.weekIndex !== currentWeekIndex) continue;
    const shiftStart = parseShiftTimeToDate(now, shift.startTime);
    if (!shiftStart) continue;
    const dueAt = new Date(shiftStart.getTime() + 60 * 60 * 1000); // 1 hour after shift start
    if (now < dueAt) {
      skippedNotDueYet += 1;
      continue;
    }

    const shiftEnd = parseShiftTimeToDate(now, shift.endTime) ?? shiftStart;
    const created = await prisma.$transaction(async (tx) => {
      const existingToday = await tx.workLog.findFirst({
        where: {
          companyId: shift.companyId,
          userId: shift.userId,
          clockIn: { gte: start, lte: end },
        },
        select: { id: true },
      });
      if (existingToday) return null;

      const row = await tx.workLog.create({
        data: {
          companyId: shift.companyId,
          userId: shift.userId,
          clockIn: shiftStart,
          clockOut: shiftEnd,
          breakMins: 0,
          note: "[AUTO_ABSENT] Automatisch als fehlend markiert.",
          status: "ABSENT",
        },
      });
      await tx.$executeRawUnsafe(
        `
        INSERT INTO "WorkLogAudit"
          ("id","companyId","workLogId","action","source","reason","afterJson")
        VALUES
          ($1,$2,$3,$4,$5,$6,$7::jsonb)
        `,
        randomUUID(),
        shift.companyId,
        row.id,
        "AUTO_ABSENT_CREATE",
        "system",
        "missing_clock_in_after_shift_start",
        JSON.stringify(row)
      );
      return row;
    });
    if (created) createdAbsentEntries += 1;
    else skippedExistingEntries += 1;
  }

  return {
    scannedShifts: shifts.length,
    createdAbsentEntries,
    skippedExistingEntries,
    skippedNotDueYet,
    executedAt: now.toISOString(),
  };
}
