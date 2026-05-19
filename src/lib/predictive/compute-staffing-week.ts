/**
 * Gemeinsame Personal-Vorhersage pro Kalenderwoche (ohne "use server").
 * Wird von Server-Actions, Insights und Planer genutzt.
 */
import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import {
  recommend,
  recommendationTone,
  type DayContext,
  type IndustryProfile,
  type StaffingRecommendation,
  type WeatherCondition,
} from "@/lib/predictive/staffing";
import { berlinDateKeyToDayOfWeek } from "@/lib/time/timezone";
import {
  getHolidayForDate,
  isBridgeDay,
  type GermanRegion,
} from "@/lib/holidays/de";
import {
  predictDemand,
  type WeatherKey,
  type EventKey,
  type ExperienceKey,
} from "@/lib/ai/core-engine";
import { normalizePeakDayLevels, peakLevelForJsDayOfWeek } from "@/lib/planning/peak-demand";

export type StaffingDayRecommendation = {
  date: string;
  dayOfWeek: number;
  recommendation: StaffingRecommendation;
  tone: "closed" | "calm" | "watch" | "urgent";
  holidayName?: string | null;
  isBridge?: boolean;
  source: "native" | "heuristic";
  peakLevel: "LOW" | "NORMAL" | "HIGH";
};

type WeatherForecastDay = {
  date: string;
  tempC?: number | null;
  condition?: WeatherCondition;
};

function extractForecast(payload: unknown): Map<string, WeatherForecastDay> {
  const out = new Map<string, WeatherForecastDay>();
  if (!payload || typeof payload !== "object") return out;
  const obj = payload as Record<string, unknown>;
  const days = (obj.days as Array<Record<string, unknown>> | undefined) ?? [];
  for (const d of days) {
    const date = typeof d.date === "string" ? d.date.slice(0, 10) : null;
    if (!date) continue;
    const tempC = typeof d.tempC === "number" ? d.tempC : typeof d.temp === "number" ? d.temp : null;
    const condRaw = typeof d.condition === "string" ? d.condition.toLowerCase() : null;
    const condition: WeatherCondition = ((): WeatherCondition => {
      if (!condRaw) return "unknown";
      if (condRaw.includes("sun") || condRaw.includes("clear") || condRaw.includes("heiter")) return "sunny";
      if (condRaw.includes("cloud") || condRaw.includes("wolk")) return "cloudy";
      if (condRaw.includes("rain") || condRaw.includes("regen")) return "rainy";
      if (condRaw.includes("storm") || condRaw.includes("gewitter")) return "stormy";
      if (condRaw.includes("snow") || condRaw.includes("schnee")) return "snow";
      return "unknown";
    })();
    out.set(date, { date, tempC, condition });
  }
  return out;
}

function mergeNativeIntoHeuristic(
  h: StaffingRecommendation,
  n: {
    headcount: number;
    rawHeadcount: number;
    confidence: number;
    breakdown: {
      historyWeight: number;
      weatherImpact: number;
      eventBonus: number;
      staffExperience: number;
      baseline: number;
    };
  },
  plannedShifts: number,
): StaffingRecommendation {
  const delta = n.headcount - plannedShifts;
  const combined =
    n.breakdown.historyWeight *
    n.breakdown.weatherImpact *
    n.breakdown.eventBonus *
    n.breakdown.staffExperience;
  const impactPct = (combined - 1) * 100;
  return {
    expectedUtilization: h.expectedUtilization,
    delta,
    confidence: n.confidence,
    drivers: [
      {
        label: `Aus Erfahrung ${impactPct >= 0 ? "+" : ""}${impactPct.toFixed(0)} %`,
        impact: combined - 1,
      },
      ...h.drivers,
    ],
  };
}

function mapToNativeWeather(condition: WeatherCondition | undefined, tempC: number | null): WeatherKey {
  if (condition === "rainy" || condition === "stormy" || condition === "snow") return "RAIN";
  if (condition === "sunny") {
    if (typeof tempC === "number" && tempC > 28) return "HOT";
    return "SUNNY";
  }
  if (typeof tempC === "number" && tempC < 5) return "COLD";
  if (condition === "cloudy") return "CLOUDY";
  return "CLOUDY";
}

function classifyEvent(
  isHoliday: boolean,
  isBridge: boolean,
  isDayBeforeHoliday: boolean,
  dayOfWeek: number,
): EventKey {
  if (isHoliday) return "PUBLIC_HOLIDAY";
  if (isBridge) return "BRIDGE_DAY";
  if (isDayBeforeHoliday) return "PUBLIC_HOLIDAY_EVE";
  if (dayOfWeek === 0 || dayOfWeek === 6) return "WEEKEND";
  return "NONE";
}

async function classifyTeamExperience(companyId: string): Promise<ExperienceKey> {
  const users = await db.user.findMany({
    where: tenantWhere(companyId, { role: { not: "COMPANY_OWNER" as const } }),
    select: { createdAt: true },
  });
  if (users.length === 0) return "UNKNOWN";
  const now = Date.now();
  const avgMonths =
    users.reduce((acc, u) => acc + (now - u.createdAt.getTime()) / (30 * 86_400_000), 0) / users.length;
  if (avgMonths > 12) return "SENIOR_HEAVY";
  if (avgMonths < 3) return "JUNIOR_HEAVY";
  return "BALANCED";
}

export async function computeStaffingRecommendationsForWeek(
  companyId: string,
  weekStart: string,
  options?: { weekIndex?: number },
): Promise<StaffingDayRecommendation[]> {
  const [y, m, d] = weekStart.split("-").map(Number);
  const startDate = new Date(Date.UTC(y, m - 1, d));
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const t = new Date(startDate.getTime() + i * 86_400_000);
    dates.push(t.toISOString().slice(0, 10));
  }

  const companyProfile = await db.company.findUnique({
    where: { id: companyId },
    select: { industry: true, region: true, peakDayLevels: true },
  });
  const peakLevels = normalizePeakDayLevels(companyProfile?.peakDayLevels);
  const industry: IndustryProfile | undefined =
    (companyProfile?.industry as IndustryProfile | null) ?? undefined;
  const region = (companyProfile?.region as GermanRegion | null) ?? null;

  const weather = await db.weatherCache.findUnique({
    where: { companyId },
    select: { payload: true },
  });
  const forecast = extractForecast(weather?.payload ?? null);

  const weekIndexFilter =
    options?.weekIndex != null ? Math.min(3, Math.max(1, Math.floor(options.weekIndex))) : undefined;

  const shifts = await db.shift.findMany({
    where: tenantWhere(companyId, {
      isDraft: false,
      ...(weekIndexFilter != null ? { weekIndex: weekIndexFilter } : {}),
    }),
    select: { dayOfWeek: true },
  });
  const plannedByDow = new Map<number, number>();
  for (const s of shifts) plannedByDow.set(s.dayOfWeek, (plannedByDow.get(s.dayOfWeek) ?? 0) + 1);

  const fourWeeksAgo = new Date(Date.now() - 28 * 86_400_000);
  const historyLogs = await db.workLog.findMany({
    where: tenantWhere(companyId, { clockIn: { gte: fourWeeksAgo } }),
    select: { clockIn: true },
  });
  const histByDow = new Map<number, number[]>();
  const histByDateAndDow = new Map<string, Map<number, number>>();
  for (const log of historyLogs) {
    const isoDate = log.clockIn.toISOString().slice(0, 10);
    const dow = berlinDateKeyToDayOfWeek(isoDate);
    if (!histByDateAndDow.has(isoDate)) histByDateAndDow.set(isoDate, new Map());
    const m1 = histByDateAndDow.get(isoDate)!;
    m1.set(dow, (m1.get(dow) ?? 0) + 1);
  }
  for (const [, dowMap] of histByDateAndDow) {
    for (const [dow, count] of dowMap) {
      const arr = histByDow.get(dow) ?? [];
      arr.push(count);
      histByDow.set(dow, arr);
    }
  }

  const holidayByDate = new Map<string, string>();
  const bridgeByDate = new Map<string, boolean>();
  const dayBeforeHolidaySet = new Set<string>();
  if (region) {
    for (const date of dates) {
      const h = getHolidayForDate(date, region);
      if (h) holidayByDate.set(date, h.name);
      bridgeByDate.set(date, isBridgeDay(date, region));
    }
    for (const date of dates) {
      const [yy, mm, dd] = date.split("-").map(Number);
      const next = new Date(Date.UTC(yy, mm - 1, dd) + 86_400_000).toISOString().slice(0, 10);
      const nextH = getHolidayForDate(next, region);
      if (nextH) dayBeforeHolidaySet.add(date);
    }
  }

  const experience = await classifyTeamExperience(companyId);

  return Promise.all(
    dates.map(async (date) => {
      const dow = berlinDateKeyToDayOfWeek(date);
      const holidayName = holidayByDate.get(date) ?? null;
      const isHoliday = Boolean(holidayName);
      const isBridge = bridgeByDate.get(date) ?? false;
      const plannedShifts = plannedByDow.get(dow) ?? 0;

      const peakLevel = peakLevelForJsDayOfWeek(dow, peakLevels);
      const ctx: DayContext = {
        date,
        plannedShifts,
        historicalSameDay: histByDow.get(dow) ?? [],
        tempC: forecast.get(date)?.tempC ?? null,
        condition: forecast.get(date)?.condition ?? "unknown",
        industry,
        isHoliday,
        holidayName: holidayName ?? undefined,
        isBridgeDay: isBridge,
        isDayBeforeHoliday: dayBeforeHolidaySet.has(date),
        peakLevel,
      };
      const heuristic = recommend(ctx);

      const native = await predictDemand(companyId, {
        date,
        weather: mapToNativeWeather(ctx.condition, ctx.tempC ?? null),
        event: classifyEvent(isHoliday, isBridge, dayBeforeHolidaySet.has(date), dow),
        experience,
      });

      const useNative = native.sampleSize > 3 && native.rawHeadcount > 0;
      const merged: StaffingRecommendation = useNative
        ? mergeNativeIntoHeuristic(heuristic, native, plannedShifts)
        : heuristic;

      return {
        date,
        dayOfWeek: dow,
        recommendation: merged,
        tone: recommendationTone(merged, { isHoliday, industry }),
        holidayName,
        isBridge,
        source: useNative ? ("native" as const) : ("heuristic" as const),
        peakLevel,
      };
    }),
  );
}
