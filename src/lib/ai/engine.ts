import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import type { AIInsightItem, AIInsightsPayload } from "@/lib/ai/types";
import { getDayBoundsUtc } from "@/lib/time/timezone";

type DashboardFacts = {
  breakViolationEmployees: number;
  overTenHourBookings: number;
  currentWeekMinutes: number;
  previousWeekMinutes: number;
};

function startOfWeekMonday(base: Date) {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function workedMinutes(clockIn: Date, clockOut: Date | null, breakMins: number) {
  if (!clockOut) return 0;
  const gross = Math.max(0, Math.round((clockOut.getTime() - clockIn.getTime()) / 60000));
  return Math.max(0, gross - Math.max(0, breakMins));
}

async function loadDashboardFacts(companyId: string): Promise<DashboardFacts> {
  const now = new Date();
  const { start: todayStartBerlinUtc } = getDayBoundsUtc("Europe/Berlin", now);
  const berlinNow = todayStartBerlinUtc;
  const monthStart = new Date(berlinNow.getFullYear(), berlinNow.getMonth(), 1);
  const monthEnd = new Date(berlinNow.getFullYear(), berlinNow.getMonth() + 1, 1);

  const weekStart = startOfWeekMonday(berlinNow);
  const weekEnd = addDays(weekStart, 7);
  const prevWeekStart = addDays(weekStart, -7);

  const [monthLogs, currentWeekLogs, previousWeekLogs] = await Promise.all([
    db.workLog.findMany({
      where: tenantWhere(companyId, {
        clockIn: { gte: monthStart, lt: monthEnd },
      }),
      select: {
        userId: true,
        clockIn: true,
        clockOut: true,
        breakMins: true,
        isOnBreak: true,
        breakStartedAt: true,
      },
    }),
    db.workLog.findMany({
      where: tenantWhere(companyId, { clockIn: { gte: weekStart, lt: weekEnd } }),
      select: { clockIn: true, clockOut: true, breakMins: true },
    }),
    db.workLog.findMany({
      where: tenantWhere(companyId, { clockIn: { gte: prevWeekStart, lt: weekStart } }),
      select: { clockIn: true, clockOut: true, breakMins: true },
    }),
  ]);

  const breakViolationUsers = new Set<string>();
  let overTenHourBookings = 0;

  for (const log of monthLogs) {
    const netMinutes = workedMinutes(log.clockIn, log.clockOut, log.breakMins);
    const missingBreakForLongShift = netMinutes >= 360 && log.breakMins < 30;
    const interruptedBreak = Boolean(log.isOnBreak || log.breakStartedAt);
    if (missingBreakForLongShift || interruptedBreak) {
      breakViolationUsers.add(log.userId);
    }
    if (netMinutes > 600) overTenHourBookings += 1;
  }

  const currentWeekMinutes = currentWeekLogs.reduce(
    (sum, log) => sum + workedMinutes(log.clockIn, log.clockOut, log.breakMins),
    0
  );
  const previousWeekMinutes = previousWeekLogs.reduce(
    (sum, log) => sum + workedMinutes(log.clockIn, log.clockOut, log.breakMins),
    0
  );

  return {
    breakViolationEmployees: breakViolationUsers.size,
    overTenHourBookings,
    currentWeekMinutes,
    previousWeekMinutes,
  };
}

function toHours(minutes: number) {
  return Math.round((minutes / 60) * 100) / 100;
}

export async function getDashboardAIInsights(companyId: string): Promise<AIInsightsPayload> {
  const facts = await loadDashboardFacts(companyId);
  const items: AIInsightItem[] = [];
  const previousBase = Math.max(1, facts.previousWeekMinutes);
  const trendDeltaPct = ((facts.currentWeekMinutes - facts.previousWeekMinutes) / previousBase) * 100;

  if (trendDeltaPct > 10) {
    items.push({
      id: "high-utilization",
      level: "warning",
      text: `Hohe Auslastung erkannt (+${Math.round(trendDeltaPct)}%).`,
    });
  }

  if (facts.breakViolationEmployees > 0) {
    items.push({
      id: "break-compliance",
      level: "info",
      text: `Rechtssicherheit: ${facts.breakViolationEmployees} Pausenzeiten wurden diesen Monat manuell korrigiert oder fehlen.`,
    });
  }

  if (facts.overTenHourBookings > 0) {
    items.push({
      id: "ten-hour-limit",
      level: "warning",
      text: `Arbeitszeit-Check: ${facts.overTenHourBookings} Buchungen überschreiten die 10-Stunden-Grenze im aktuellen Monat.`,
    });
  }

  if (items.length === 0) {
    items.push({
      id: "stable-operations",
      level: "success",
      text: "Betrieb läuft stabil. Alle Ruhezeiten wurden eingehalten.",
    });
  }

  items.push({
    id: "capacity-trend",
    level: "info",
    text: `Kapazitäts-Trend: ${toHours(facts.currentWeekMinutes)}h diese Woche vs. ${toHours(facts.previousWeekMinutes)}h Vorwoche.`,
  });

  return {
    generatedAt: new Date().toISOString(),
    items,
  };
}
