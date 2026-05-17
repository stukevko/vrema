import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import type { AIInsightItem, AIInsightsPayload } from "@/lib/ai/types";
import { getDayBoundsUtc } from "@/lib/time/timezone";
import { getFiscalHealthCheck } from "@/lib/planning/intelligence";

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

  const fiscal = await getFiscalHealthCheck(companyId, new Date());
  if (fiscal.hasData && fiscal.overBudget && fiscal.laborShare != null) {
    const pct = Math.round(fiscal.laborShare * 100);
    const peak = fiscal.peakDayLabel && fiscal.peakDayEuro != null
      ? ` Höchste Tages-Lohnlast: ${fiscal.peakDayLabel} (~${fiscal.peakDayEuro.toFixed(0)} €).`
      : "";
    const shiftsHint =
      fiscal.shiftCountOverBudget > 0
        ? ` ${fiscal.shiftCountOverBudget} geplante Schicht(en) liegen deutlich über dem pro-Schicht-Ziel.`
        : "";
    items.push({
      id: "fiscal-labor-share",
      level: "warning",
      text: `Personalkosten wirken hoch: rund ${pct} % vom geschätzten Wochenumsatz (Ziel unter 35 %).${peak}${shiftsHint}`,
      actionLabel: "Plan optimieren",
      actionHref:
        fiscal.peakDayOfWeek != null
          ? `/dashboard/planning?focus=cost-peak&day=${fiscal.peakDayOfWeek}${fiscal.weekIndex != null ? `&week=${fiscal.weekIndex}` : ""}`
          : `/dashboard/planning?focus=cost-peak${fiscal.weekIndex != null ? `&week=${fiscal.weekIndex}` : ""}`,
    });
  }

  if (trendDeltaPct > 10) {
    items.push({
      id: "high-utilization",
      level: "warning",
      text: `Diese Woche deutlich mehr Stunden als letzte Woche (ca. +${Math.round(trendDeltaPct)} %). Prüfe, ob der Plan noch passt.`,
    });
  }

  if (facts.breakViolationEmployees > 0) {
    items.push({
      id: "break-compliance",
      level: "info",
      text: `${facts.breakViolationEmployees} Mitarbeitende: Pause fehlt oder wurde nachträglich korrigiert (diesen Monat).`,
    });
  }

  if (facts.overTenHourBookings > 0) {
    items.push({
      id: "ten-hour-limit",
      level: "warning",
      text: `${facts.overTenHourBookings} Schichten länger als 10 Stunden im aktuellen Monat — ArbZG-Grenze prüfen.`,
    });
  }

  if (items.length === 0) {
    items.push({
      id: "stable-operations",
      level: "success",
      text: "Ruhezeiten und Pausen sehen diese Woche unauffällig aus.",
    });
  }

  items.push({
    id: "capacity-trend",
    level: "info",
    text: `Stunden-Vergleich: ${toHours(facts.currentWeekMinutes)} h diese Woche, ${toHours(facts.previousWeekMinutes)} h in der Vorwoche.`,
  });

  return {
    generatedAt: new Date().toISOString(),
    items,
  };
}

export { getFiscalHealthCheck } from "@/lib/planning/intelligence";
