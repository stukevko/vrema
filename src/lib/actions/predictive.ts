"use server";

import { requireTenant, requireTenantAction } from "@/lib/tenant-guard";
import { buildForecastHorizon, type ForecastWeekSlot } from "@/lib/planning/forecast-horizon";
import { cycleWeekStartIso } from "@/lib/planning/cycle-week-start";
import {
  computeStaffingRecommendationsForWeek,
  type StaffingDayRecommendation,
} from "@/lib/predictive/compute-staffing-week";
import { staffingByDayForPlannerWeek } from "@/lib/ai/forward-insights";
import { db } from "@/lib/db";
import { clampWeekIndex, normalizeCycleWeeks } from "@/lib/shift-cycle";

export type StaffingForecastHorizon = {
  cycleWeeks: number;
  weeks: Array<
    ForecastWeekSlot & {
      days: StaffingDayRecommendation[];
    }
  >;
};

export async function getStaffingForecastHorizon(): Promise<StaffingForecastHorizon> {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { shiftCycleWeeks: true },
  });
  const cycleWeeks = normalizeCycleWeeks(company?.shiftCycleWeeks);
  const slots = buildForecastHorizon(cycleWeeks);

  const weeks = await Promise.all(
    slots.map(async (slot) => ({
      ...slot,
      days: await computeStaffingRecommendationsForWeek(companyId, slot.weekStart, {
        weekIndex: slot.weekIndex,
      }),
    })),
  );

  return { cycleWeeks, weeks };
}

export async function getStaffingRecommendations(
  weekStart: string,
  options?: { weekIndex?: number },
): Promise<StaffingDayRecommendation[]> {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }
  return computeStaffingRecommendationsForWeek(companyId, weekStart, options);
}

export type PlannerStaffingHint = {
  dayOfWeek: number;
  tone: "closed" | "calm" | "watch" | "urgent";
  label: string;
  delta: number;
  tooltip: string;
};

/** Kompakte Personal-Hinweise pro Tag für den Schichtplaner (aktuelle Zykluswoche). */
export async function getPlannerStaffingHints(weekIndex: number): Promise<PlannerStaffingHint[]> {
  const tenant = await requireTenantAction();
  if (!tenant.ok || !["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(tenant.role ?? "")) {
    return [];
  }
  const { companyId } = tenant;
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { shiftCycleWeeks: true },
  });
  const cycleWeeks = normalizeCycleWeeks(company?.shiftCycleWeeks);
  const wk = clampWeekIndex(weekIndex, cycleWeeks);
  const weekStart = cycleWeekStartIso(wk);
  const map = await staffingByDayForPlannerWeek(companyId, wk, weekStart);
  return Array.from(map.entries()).map(([dayOfWeek, v]) => ({
    dayOfWeek,
    ...v,
  }));
}
