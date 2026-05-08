import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import type { ShiftPlanRow } from "@/lib/planning/compliance";
import { buildComplianceFlagsByShiftId } from "@/lib/planning/compliance";
import { compareTradeHourlyCost } from "@/lib/planning/budget";
import { getWeekCycleIndex, normalizeCycleWeeks } from "@/lib/shift-cycle";

const MINUTES_PER_DAY = 24 * 60;
const DAYS_PER_WEEK = 7;
const MINUTES_PER_WEEK = MINUTES_PER_DAY * DAYS_PER_WEEK;

function parseTimeToMinutes(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function shiftToInterval(dayOfWeek: number, startTime: string, endTime: string) {
  const startMinute = parseTimeToMinutes(startTime);
  const endMinute = parseTimeToMinutes(endTime);
  if (startMinute === null || endMinute === null) return null;
  if (startMinute === endMinute) return null;
  const absoluteStart = dayOfWeek * MINUTES_PER_DAY + startMinute;
  const absoluteEnd =
    dayOfWeek * MINUTES_PER_DAY + (endMinute <= startMinute ? endMinute + MINUTES_PER_DAY : endMinute);
  return { start: absoluteStart, end: absoluteEnd };
}

function intervalsOverlap(a: { start: number; end: number }, b: { start: number; end: number }) {
  return a.start < b.end && b.start < a.end;
}

function shiftNetMinutes(startTime: string, endTime: string, breakDuration: number) {
  const sm = parseTimeToMinutes(startTime);
  const em = parseTimeToMinutes(endTime);
  if (sm === null || em === null || sm === em) return 0;
  const gross = em > sm ? em - sm : 24 * 60 - sm + em;
  return Math.max(0, gross - Math.max(0, breakDuration));
}

function hasOverlapForUser(
  userId: string,
  weekIndex: number,
  shifts: Array<{
    id: string;
    userId: string;
    weekIndex: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>,
  candidate: { dayOfWeek: number; startTime: string; endTime: string },
  ignoreShiftId: string
): boolean {
  const cand = shiftToInterval(candidate.dayOfWeek, candidate.startTime, candidate.endTime);
  if (!cand) return false;

  for (const row of shifts) {
    if (row.userId !== userId || row.weekIndex !== weekIndex || row.id === ignoreShiftId) continue;
    const interval = shiftToInterval(row.dayOfWeek, row.startTime, row.endTime);
    if (!interval) continue;
    const variants = [
      interval,
      { start: interval.start + MINUTES_PER_WEEK, end: interval.end + MINUTES_PER_WEEK },
      { start: interval.start - MINUTES_PER_WEEK, end: interval.end - MINUTES_PER_WEEK },
    ];
    if (variants.some((v) => intervalsOverlap(cand, v))) return true;
  }
  return false;
}

function toPlanRows(
  shifts: Array<{
    id: string;
    userId: string;
    weekIndex: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>
): ShiftPlanRow[] {
  return shifts.map((s) => ({
    id: s.id,
    userId: s.userId,
    weekIndex: s.weekIndex,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
  }));
}

export type TradeApprovalIntel = {
  legalOk: boolean;
  overlapRisk: boolean;
  restRiskForAcquirer: boolean;
  costNeutral: boolean;
  acquirerMoreExpensive: boolean;
  overtimeHoursForAcquirer: number;
  badge: "green" | "amber" | "red";
  managerLine: string;
  detailLines: string[];
};

/**
 * Prüft Tausch: Ruhezeit für Übernehmer (simuliert), Überschneidung, Lohnvergleich, Überstunden-Heuristik.
 */
export async function evaluateShiftTradeProposal(companyId: string, shiftId: string): Promise<TradeApprovalIntel | null> {
  const shift = await db.shift.findFirst({
    where: tenantWhere(companyId, { id: shiftId }),
    select: {
      id: true,
      userId: true,
      weekIndex: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      breakDuration: true,
      tradeRequestedBy: true,
      tradeStatus: true,
    },
  });
  if (!shift?.tradeRequestedBy) return null;

  const [owner, acquirer, allWeekShifts] = await Promise.all([
    db.user.findFirst({
      where: tenantWhere(companyId, { id: shift.userId }),
      select: { hourlyWage: true, weeklyHours: true, name: true, email: true },
    }),
    db.user.findFirst({
      where: tenantWhere(companyId, { id: shift.tradeRequestedBy }),
      select: { hourlyWage: true, weeklyHours: true, name: true, email: true },
    }),
    db.shift.findMany({
      where: tenantWhere(companyId, { weekIndex: shift.weekIndex }),
      select: {
        id: true,
        userId: true,
        weekIndex: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        breakDuration: true,
      },
    }),
  ]);

  if (!owner || !acquirer) return null;

  const simulated = allWeekShifts.map((s) =>
    s.id === shift.id ? { ...s, userId: shift.tradeRequestedBy! } : s
  );

  const overlapRisk = hasOverlapForUser(
    shift.tradeRequestedBy,
    shift.weekIndex,
    simulated,
    {
      dayOfWeek: shift.dayOfWeek,
      startTime: shift.startTime,
      endTime: shift.endTime,
    },
    shift.id
  );

  const flags = buildComplianceFlagsByShiftId(toPlanRows(simulated), shift.weekIndex);
  const acquirerRow = simulated.find((s) => s.id === shift.id);
  const restRiskForAcquirer = acquirerRow
    ? Boolean(flags.get(acquirerRow.id)?.restRisk)
    : false;

  const legalOk = !overlapRisk && !restRiskForAcquirer;

  const wage = compareTradeHourlyCost(owner.hourlyWage, acquirer.hourlyWage);
  const acquirerMoreExpensive = wage.acquirerMoreExpensive;
  const costNeutral = !acquirerMoreExpensive;

  const targetMin = Math.max(0, Math.round((acquirer.weeklyHours ?? 40) * 60));
  const acquirerNetBefore = allWeekShifts
    .filter((s) => s.userId === shift.tradeRequestedBy && s.id !== shift.id)
    .reduce((sum, s) => sum + shiftNetMinutes(s.startTime, s.endTime, s.breakDuration ?? 0), 0);
  const shiftNet = shiftNetMinutes(shift.startTime, shift.endTime, shift.breakDuration ?? 0);
  const acquirerNetAfter = acquirerNetBefore + shiftNet;
  const overtimeMinutes = Math.max(0, acquirerNetAfter - targetMin);
  const overtimeHoursForAcquirer = Math.round((overtimeMinutes / 60) * 10) / 10;

  const detailLines: string[] = [];
  if (overlapRisk) detailLines.push("Die Schicht überschneidet sich mit einer bestehenden Schicht des Übernehmers.");
  if (restRiskForAcquirer) detailLines.push("Ruhezeit unter 11 Stunden für den Übernehmer nach Simulation.");
  if (acquirerMoreExpensive && wage.deltaPerHour != null) {
    detailLines.push(`Stundenlohn Übernehmer höher (+${wage.deltaPerHour.toFixed(2)} €/h vs. bisheriger Inhaber).`);
  }
  if (overtimeHoursForAcquirer > 0.25) {
    detailLines.push(`Übernehmer liegt nach Tausch ca. ${overtimeHoursForAcquirer}h über dem Wochen-Soll (Plan-Netto).`);
  }

  let badge: TradeApprovalIntel["badge"] = "green";
  if (!legalOk) badge = "red";
  else if (!costNeutral || overtimeHoursForAcquirer > 2) badge = "amber";

  let managerLine = "Rechtlich geprüft: Keine Ruhezeit- oder Überschneidungskonflikte für den Übernehmer.";
  if (!legalOk) {
    managerLine = "Achtung: Rechtliche oder planerische Konflikte – Freigabe nur nach manueller Prüfung.";
  } else if (badge === "amber") {
    managerLine = "Rechtlich möglich, aber Kosten- oder Auslastungs-Hinweis – bitte kurz prüfen.";
  }

  return {
    legalOk,
    overlapRisk,
    restRiskForAcquirer,
    costNeutral,
    acquirerMoreExpensive,
    overtimeHoursForAcquirer,
    badge,
    managerLine,
    detailLines,
  };
}

export type FiscalHealthResult = {
  hasData: boolean;
  weekIndex: 1 | 2 | 3 | null;
  laborEuro: number;
  revenueEuro: number | null;
  laborShare: number | null;
  overBudget: boolean;
  peakDayOfWeek: number | null;
  peakDayLabel: string | null;
  peakDayEuro: number | null;
  shiftCountOverBudget: number;
};

const DAY_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

/**
 * Plant die aktuelle ISO-Woche: Zyklus-Index wie im Planer, geschätzte Lohnkosten vs. optionaler Wochenumsatz.
 */
export async function getFiscalHealthCheck(companyId: string, referenceDate = new Date()): Promise<FiscalHealthResult> {
  const company = await db.company.findFirst({
    where: { id: companyId },
    select: {
      estimatedWeeklyRevenue: true,
      shiftCycleWeeks: true,
    },
  });
  if (!company?.estimatedWeeklyRevenue || company.estimatedWeeklyRevenue <= 0) {
    return {
      hasData: false,
      weekIndex: null,
      laborEuro: 0,
      revenueEuro: null,
      laborShare: null,
      overBudget: false,
      peakDayOfWeek: null,
      peakDayLabel: null,
      peakDayEuro: null,
      shiftCountOverBudget: 0,
    };
  }

  const cycleWeeks = normalizeCycleWeeks(company.shiftCycleWeeks);
  const weekIndex = getWeekCycleIndex(referenceDate, cycleWeeks);

  const shifts = await db.shift.findMany({
    where: tenantWhere(companyId, { weekIndex }),
    select: {
      id: true,
      userId: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      breakDuration: true,
    },
  });

  const userIds = [...new Set(shifts.map((s) => s.userId))];
  const wages = await db.user.findMany({
    where: tenantWhere(companyId, { id: { in: userIds } }),
    select: { id: true, hourlyWage: true },
  });
  const wageByUser = new Map(wages.map((w) => [w.id, w.hourlyWage]));

  const laborByDay = new Map<number, number>();
  let laborEuro = 0;
  for (const s of shifts) {
    const wage = wageByUser.get(s.userId);
    if (wage == null || wage <= 0) continue;
    const netH = shiftNetMinutes(s.startTime, s.endTime, s.breakDuration ?? 0) / 60;
    const euro = netH * wage;
    laborEuro += euro;
    laborByDay.set(s.dayOfWeek, (laborByDay.get(s.dayOfWeek) ?? 0) + euro);
  }
  laborEuro = Math.round(laborEuro * 100) / 100;

  const revenue = company.estimatedWeeklyRevenue;
  const laborShare = revenue > 0 ? laborEuro / revenue : null;
  const overBudget = laborShare != null && laborShare > 0.35;

  let peakDayLabel: string | null = null;
  let peakDayEuro: number | null = null;
  let peakDayOfWeek: number | null = null;
  for (const [dow, eur] of laborByDay) {
    if (peakDayEuro === null || eur > peakDayEuro) {
      peakDayEuro = Math.round(eur * 100) / 100;
      peakDayOfWeek = dow;
      peakDayLabel = DAY_DE[dow] ?? String(dow);
    }
  }

  const priced = shifts.filter((s) => {
    const w = wageByUser.get(s.userId);
    return w != null && w > 0;
  });
  const perShiftBudget = revenue / Math.max(1, priced.length);
  const shiftCountOverBudget = priced.filter((s) => {
    const w = wageByUser.get(s.userId)!;
    const netH = shiftNetMinutes(s.startTime, s.endTime, s.breakDuration ?? 0) / 60;
    return netH * w > perShiftBudget * 1.2;
  }).length;

  return {
    hasData: true,
    weekIndex,
    laborEuro,
    revenueEuro: revenue,
    laborShare: laborShare != null ? Math.round(laborShare * 1000) / 1000 : null,
    overBudget,
    peakDayOfWeek,
    peakDayLabel,
    peakDayEuro,
    shiftCountOverBudget,
  };
}
