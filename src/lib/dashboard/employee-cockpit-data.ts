import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { getWeekCycleIndex, normalizeCycleWeeks } from "@/lib/shift-cycle";
import { getMonthBoundsUtc } from "@/lib/time/timezone";
import { AbsenceType, VacationStatus } from "@prisma/client";

export type CockpitNextShift = {
  shiftId: string;
  startTime: string;
  endTime: string;
  /** Anzahl Tage in der Zukunft (0=heute, 1=morgen, ...) */
  daysAhead: number;
  /** Lesbare Bezeichnung (heute / morgen / Wochentag + Datum) */
  whenLabel: string;
};

export type CockpitVacationStats = {
  total: number;
  taken: number;
  remaining: number;
  pendingRequests: number;
  pendingDays: number;
};

export type EmployeeCockpitData = {
  isClockedIn: boolean;
  /** ISO-String der aktuellen Clock-In-Zeit (für Anzeige im Hero). */
  clockInAtIso: string | null;
  isOnBreak: boolean;
  workedTodayMins: number;
  workedThisMonthMins: number;
  nextShift: CockpitNextShift | null;
  vacation: CockpitVacationStats;
};

const DAY_NAMES = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

function getBerlinTodayParts(now: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = p.value;
  const dayOfWeek = now.getDay(); // already UTC-day; for Europe/Berlin same day boundary mostly; OK for navigation
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    dayOfWeek,
    nowMinutes: Number(map.hour) * 60 + Number(map.minute),
  };
}

function parseHHMMToMinutes(hhmm: string): number | null {
  const [hRaw, mRaw] = hhmm.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function dayLabel(daysAhead: number, dayOfWeek: number, hhmm: string): string {
  if (daysAhead === 0) return `Heute, ${hhmm}`;
  if (daysAhead === 1) return `Morgen, ${hhmm}`;
  return `${DAY_NAMES[dayOfWeek] ?? ""}, ${hhmm}`;
}

/**
 * Sucht die nächste anstehende Schicht (heute später, oder kommende Tage – maximal eine vollständige Cycle-Woche voraus).
 * Berücksichtigt `weekIndex` bei mehrwöchigen Zyklen.
 */
async function findNextShift(params: {
  companyId: string;
  userId: string;
  cycleWeeks: number;
  now: Date;
}): Promise<CockpitNextShift | null> {
  const { companyId, userId, now } = params;
  const cycleWeeks = normalizeCycleWeeks(params.cycleWeeks);
  const today = getBerlinTodayParts(now);

  const lookaheadDays = cycleWeeks * 7;
  for (let offset = 0; offset < lookaheadDays; offset += 1) {
    const cursor = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
    const weekIndex = getWeekCycleIndex(cursor, cycleWeeks);
    const dayOfWeek = (today.dayOfWeek + offset) % 7;

    const candidates = await db.shift.findMany({
      where: tenantWhere(companyId, {
        userId,
        weekIndex,
        dayOfWeek,
        isDraft: false,
      }),
      orderBy: { startTime: "asc" },
      select: { id: true, startTime: true, endTime: true },
    });

    for (const c of candidates) {
      if (offset === 0) {
        const startMin = parseHHMMToMinutes(c.startTime);
        if (startMin === null) continue;
        if (startMin <= today.nowMinutes) continue;
      }
      return {
        shiftId: c.id,
        startTime: c.startTime,
        endTime: c.endTime,
        daysAhead: offset,
        whenLabel: dayLabel(offset, dayOfWeek, c.startTime),
      };
    }
  }
  return null;
}

async function getVacationStats(params: {
  companyId: string;
  userId: string;
  now: Date;
}): Promise<CockpitVacationStats> {
  const { companyId, userId, now } = params;
  const user = await db.user.findFirst({
    where: tenantWhere(companyId, { id: userId }),
    select: { vacationDays: true },
  });
  const total = user?.vacationDays ?? 0;

  const year = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric" }).format(now),
  );
  const start = new Date(Date.UTC(year, 0, 1));
  const endExclusive = new Date(Date.UTC(year + 1, 0, 1));

  const [approved, pending] = await Promise.all([
    db.vacationRequest.findMany({
      where: tenantWhere(companyId, {
        userId,
        status: VacationStatus.APPROVED,
        absenceType: AbsenceType.VACATION,
        startDate: { gte: start, lt: endExclusive },
      }),
      select: { days: true },
    }),
    db.vacationRequest.findMany({
      where: tenantWhere(companyId, {
        userId,
        status: VacationStatus.PENDING,
      }),
      select: { days: true },
    }),
  ]);

  const taken = approved.reduce((acc, r) => acc + r.days, 0);
  const remaining = Math.max(0, total - taken);
  const pendingDays = pending.reduce((acc, r) => acc + r.days, 0);
  return { total, taken, remaining, pendingRequests: pending.length, pendingDays };
}

export async function getEmployeeCockpitData(params: {
  companyId: string;
  userId: string;
  now?: Date;
}): Promise<EmployeeCockpitData> {
  const now = params.now ?? new Date();
  const company = await db.company.findUnique({
    where: { id: params.companyId },
    select: { shiftCycleWeeks: true },
  });
  const cycleWeeks = company?.shiftCycleWeeks ?? 1;

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const berlinYear = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric" }).format(now),
  );
  const berlinMonth = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", month: "2-digit" }).format(now),
  );
  const monthBounds = getMonthBoundsUtc(berlinYear, berlinMonth);

  const [activeLog, todayLogs, monthLogs, nextShift, vacation] = await Promise.all([
    db.workLog.findFirst({
      where: tenantWhere(params.companyId, { userId: params.userId, clockOut: null }),
      select: { id: true, clockIn: true, isOnBreak: true },
    }),
    db.workLog.findMany({
      where: tenantWhere(params.companyId, {
        userId: params.userId,
        clockIn: { gte: startOfDay },
      }),
      select: { clockIn: true, clockOut: true, breakMins: true },
    }),
    db.workLog.findMany({
      where: tenantWhere(params.companyId, {
        userId: params.userId,
        clockIn: { gte: monthBounds.start, lt: monthBounds.endExclusive },
      }),
      select: { clockIn: true, clockOut: true, breakMins: true },
    }),
    findNextShift({ companyId: params.companyId, userId: params.userId, cycleWeeks, now }),
    getVacationStats({ companyId: params.companyId, userId: params.userId, now }),
  ]);

  const sumWorkedMinutes = (logs: { clockIn: Date; clockOut: Date | null; breakMins: number }[]) =>
    logs.reduce((acc, log) => {
      const end = log.clockOut ?? now;
      const minutes = (end.getTime() - log.clockIn.getTime()) / 60000 - log.breakMins;
      return acc + Math.max(0, minutes);
    }, 0);

  return {
    isClockedIn: Boolean(activeLog),
    clockInAtIso: activeLog?.clockIn ? activeLog.clockIn.toISOString() : null,
    isOnBreak: Boolean(activeLog?.isOnBreak),
    workedTodayMins: Math.round(sumWorkedMinutes(todayLogs)),
    workedThisMonthMins: Math.round(sumWorkedMinutes(monthLogs)),
    nextShift,
    vacation,
  };
}
