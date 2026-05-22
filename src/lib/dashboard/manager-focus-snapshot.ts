import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { UserRole } from "@prisma/client";
import { buildForecastHorizon, formatWeekRangeLabel } from "@/lib/planning/forecast-horizon";
import { countWeekCoverageGapSlots } from "@/lib/planning/planner-coverage-metrics";
import type { ShiftPlanRow } from "@/lib/planning/compliance";
import { getWeekCycleIndex, normalizeCycleWeeks } from "@/lib/shift-cycle";
import { berlinDateKeyToDayOfWeek, getBerlinDateKey } from "@/lib/time/timezone";
import type { CompanyModules } from "@/lib/company-modules";

const DEFAULT_NEEDED_STAFF = 2;
const COVERAGE_SLOT_MINUTES = 60;

export type ManagerFocusSnapshot = {
  focusWeek: 1 | 2 | 3;
  weekLabel: string;
  today: {
    scheduledCount: number;
    presentNow: number;
    totalEmployees: number;
  };
  planning: {
    gapSlots: number;
    maxSlots: number;
    fillPercent: number;
  };
  approvals: {
    total: number;
    vacations: number;
    corrections: number;
    trades: number;
    primaryHref: string;
    primaryCta: string;
  };
};

function maxWeekCoverageSlots(): number {
  const perDay = Math.ceil((24 * 60) / COVERAGE_SLOT_MINUTES);
  return perDay * 7;
}

export async function getManagerFocusSnapshot(
  companyId: string,
  teamStats: {
    totalEmployees: number;
    activeToday: number;
    pendingVacations: number;
    pendingCorrections: number;
    pendingTradeApprovals: number;
  },
  modules: CompanyModules,
  conflictEntries: Array<{ userId: string; dayOfWeek: number; type?: "VACATION" | "SICK" }>,
): Promise<ManagerFocusSnapshot> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { shiftCycleWeeks: true },
  });
  const cycleWeeks = normalizeCycleWeeks(company?.shiftCycleWeeks);
  const horizon = buildForecastHorizon(cycleWeeks);
  const primary = horizon.find((w) => w.isPrimary) ?? horizon[0];
  const focusWeek = primary?.weekIndex ?? getWeekCycleIndex(new Date(), cycleWeeks);
  const weekLabel = primary ? formatWeekRangeLabel(primary.weekStart) : `Woche ${focusWeek}`;

  const todayDow = berlinDateKeyToDayOfWeek(getBerlinDateKey(new Date()));

  const [members, shifts] = await Promise.all([
    db.user.findMany({
      where: tenantWhere(companyId, { isActive: true, role: { in: [UserRole.EMPLOYEE, UserRole.MANAGER] } }),
      select: { id: true },
    }),
    db.shift.findMany({
      where: tenantWhere(companyId, { weekIndex: focusWeek, isDraft: false }),
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

  const scheduledToday = shifts.filter((s) => s.dayOfWeek === todayDow).length;

  const planRows: ShiftPlanRow[] = shifts.map((s) => ({
    id: s.id,
    userId: s.userId,
    weekIndex: s.weekIndex,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    breakDuration: s.breakDuration ?? 0,
  }));

  const gapSlots = countWeekCoverageGapSlots({
    members,
    shifts: planRows,
    selectedWeekIndex: focusWeek,
    conflictEntries,
    neededStaff: DEFAULT_NEEDED_STAFF,
    coverageSlotMinutes: COVERAGE_SLOT_MINUTES,
  });

  const maxSlots = maxWeekCoverageSlots();
  const fillPercent = maxSlots > 0 ? Math.round(Math.max(0, Math.min(100, (1 - gapSlots / maxSlots) * 100))) : 100;

  const trades = modules.shiftTrade ? teamStats.pendingTradeApprovals : 0;
  const vacations = teamStats.pendingVacations;
  const corrections = teamStats.pendingCorrections;
  const total = vacations + corrections + trades;

  let primaryHref = "/dashboard/planning";
  let primaryCta = "Zum Planer";
  if (vacations > 0) {
    primaryHref = "/dashboard/vacation#team-vacation-requests";
    primaryCta = "Anträge prüfen";
  } else if (corrections > 0) {
    primaryHref = "/dashboard/reports#zeitkorrekturen";
    primaryCta = "Korrekturen prüfen";
  } else if (trades > 0) {
    primaryHref = "/dashboard/planning#shift-trade-approvals";
    primaryCta = "Tausch prüfen";
  } else if (gapSlots > 0) {
    primaryHref = `/dashboard/planning?focusWeek=${focusWeek}`;
    primaryCta = "Lücken schließen";
  }

  return {
    focusWeek,
    weekLabel,
    today: {
      scheduledCount: scheduledToday,
      presentNow: teamStats.activeToday,
      totalEmployees: teamStats.totalEmployees,
    },
    planning: { gapSlots, maxSlots, fillPercent },
    approvals: {
      total,
      vacations,
      corrections,
      trades,
      primaryHref,
      primaryCta,
    },
  };
}
