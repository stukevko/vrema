"use server";

import { requireTenant } from "@/lib/tenant-guard";
import { buildForecastHorizon, type ForecastWeekSlot } from "@/lib/planning/forecast-horizon";
import { cycleWeekStartIso } from "@/lib/planning/cycle-week-start";
import {
  computeStaffingRecommendationsForWeek,
  type StaffingDayRecommendation,
} from "@/lib/predictive/compute-staffing-week";
import { staffingByDayForPlannerWeek } from "@/lib/ai/forward-insights";
import { db } from "@/lib/db";

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
  const cycleWeeks = company?.shiftCycleWeeks ?? 1;
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
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }
  const wk = Math.min(3, Math.max(1, Math.floor(weekIndex))) as 1 | 2 | 3;
  const weekStart = cycleWeekStartIso(wk);
  const map = await staffingByDayForPlannerWeek(companyId, wk, weekStart);
  return Array.from(map.entries()).map(([dayOfWeek, v]) => ({
    dayOfWeek,
    ...v,
  }));
}
