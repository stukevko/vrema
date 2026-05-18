import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { getDayBoundsUtc, getBerlinDateKey, berlinDateKeyToDayOfWeek } from "@/lib/time/timezone";
import { getWeekCycleIndex, normalizeCycleWeeks } from "@/lib/shift-cycle";
import { shiftNetDurationMinutes } from "@/lib/planning/shift-duration";

export type PlanVsIstRow = {
  userName: string;
  plannedMinutes: number;
  workedMinutes: number;
  deltaMinutes: number;
};

export type PlanVsIstSummary = {
  dateLabel: string;
  plannedTotalMinutes: number;
  workedTotalMinutes: number;
  rows: PlanVsIstRow[];
};

export async function getTodayPlanVsIst(companyId: string): Promise<PlanVsIstSummary | null> {
  const now = new Date();
  const dayKey = getBerlinDateKey(now);
  const dow = berlinDateKeyToDayOfWeek(dayKey);
  const { start, end } = getDayBoundsUtc(undefined, now);

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { shiftCycleWeeks: true },
  });
  if (!company) return null;

  const cycle = normalizeCycleWeeks(company.shiftCycleWeeks);
  const weekIndex = getWeekCycleIndex(now, cycle);

  const [shifts, logs] = await Promise.all([
    db.shift.findMany({
      where: tenantWhere(companyId, {
        weekIndex,
        dayOfWeek: dow,
        isDraft: false,
      }),
      select: {
        startTime: true,
        endTime: true,
        breakDuration: true,
        user: { select: { name: true, email: true } },
      },
    }),
    db.workLog.findMany({
      where: tenantWhere(companyId, {
        clockIn: { gte: start, lt: end },
      }),
      select: {
        clockIn: true,
        clockOut: true,
        breakMins: true,
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  if (shifts.length === 0 && logs.length === 0) return null;

  const plannedByUser = new Map<string, { name: string; minutes: number }>();
  for (const s of shifts) {
    const name = (s.user.name?.trim() || s.user.email).trim();
    const key = name.toLowerCase();
    const mins = shiftNetDurationMinutes(s.startTime, s.endTime, s.breakDuration ?? 0);
    const prev = plannedByUser.get(key);
    plannedByUser.set(key, {
      name,
      minutes: (prev?.minutes ?? 0) + mins,
    });
  }

  const workedByUser = new Map<string, { name: string; minutes: number }>();
  for (const l of logs) {
    const name = (l.user.name?.trim() || l.user.email).trim();
    const key = name.toLowerCase();
    const endTs = l.clockOut ?? now;
    const gross = Math.max(0, Math.round((endTs.getTime() - l.clockIn.getTime()) / 60_000));
    const mins = Math.max(0, gross - (l.breakMins ?? 0));
    const prev = workedByUser.get(key);
    workedByUser.set(key, {
      name,
      minutes: (prev?.minutes ?? 0) + mins,
    });
  }

  const keys = new Set([...plannedByUser.keys(), ...workedByUser.keys()]);
  const rows: PlanVsIstRow[] = [...keys].map((key) => {
    const p = plannedByUser.get(key);
    const w = workedByUser.get(key);
    const plannedMinutes = p?.minutes ?? 0;
    const workedMinutes = w?.minutes ?? 0;
    return {
      userName: p?.name ?? w?.name ?? "Unbekannt",
      plannedMinutes,
      workedMinutes,
      deltaMinutes: workedMinutes - plannedMinutes,
    };
  });

  rows.sort((a, b) => Math.abs(b.deltaMinutes) - Math.abs(a.deltaMinutes));

  const dateLabel = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "Europe/Berlin",
  }).format(now);

  return {
    dateLabel,
    plannedTotalMinutes: rows.reduce((s, r) => s + r.plannedMinutes, 0),
    workedTotalMinutes: rows.reduce((s, r) => s + r.workedMinutes, 0),
    rows: rows.slice(0, 6),
  };
}

function formatHm(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} Min`;
  if (m === 0) return `${h} Std`;
  return `${h} Std ${m} Min`;
}

export { formatHm as formatMinutesDe };
