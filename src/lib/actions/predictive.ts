"use server";

import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
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

type WeatherForecastDay = {
  date: string;
  tempC?: number | null;
  condition?: WeatherCondition;
};

/** Liest den WeatherCache.payload und holt eine grobe Tagesvorhersage raus. */
function extractForecast(payload: unknown): Map<string, WeatherForecastDay> {
  const out = new Map<string, WeatherForecastDay>();
  if (!payload || typeof payload !== "object") return out;
  // Wir versuchen mehrere übliche Strukturen – egal welches Wetter-Backend dahinter steht.
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

/**
 *  Liefert pro Tag eine Auslastungs-Empfehlung für die kommenden 7 Tage.
 *  Wird vom Schichtplaner (Pille pro Tagesspalte) und vom Dashboard genutzt.
 */
export async function getStaffingRecommendations(weekStart: string): Promise<
  Array<{
    date: string;
    dayOfWeek: number;
    recommendation: StaffingRecommendation;
    tone: "closed" | "calm" | "watch" | "urgent";
    holidayName?: string | null;
    isBridge?: boolean;
  }>
> {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const [y, m, d] = weekStart.split("-").map(Number);
  const startDate = new Date(Date.UTC(y, m - 1, d));
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const t = new Date(startDate.getTime() + i * 86_400_000);
    dates.push(t.toISOString().slice(0, 10));
  }

  // Firmen-Profil (Industry + Region) für Predictive v2
  const companyProfile = await db.company.findUnique({
    where: { id: companyId },
    select: { industry: true, region: true },
  });
  const industry: IndustryProfile | undefined =
    (companyProfile?.industry as IndustryProfile | null) ?? undefined;
  const region = (companyProfile?.region as GermanRegion | null) ?? null;

  // Wetter-Snapshot aus dem Cache
  const weather = await db.weatherCache.findUnique({
    where: { companyId },
    select: { payload: true },
  });
  const forecast = extractForecast(weather?.payload ?? null);

  // Geplante Schichten je Wochentag
  const shifts = await db.shift.findMany({
    where: tenantWhere(companyId, { isDraft: false }),
    select: { dayOfWeek: true },
  });
  const plannedByDow = new Map<number, number>();
  for (const s of shifts) plannedByDow.set(s.dayOfWeek, (plannedByDow.get(s.dayOfWeek) ?? 0) + 1);

  // Historie: gleicher Wochentag in letzten 4 Wochen (über WorkLog-Anzahl, robust)
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

  // Feiertage für den gesamten Zeitraum vorbereiten
  const holidayByDate = new Map<string, string>();
  const bridgeByDate = new Map<string, boolean>();
  const dayBeforeHolidaySet = new Set<string>();
  if (region) {
    for (const date of dates) {
      const h = getHolidayForDate(date, region);
      if (h) holidayByDate.set(date, h.name);
      bridgeByDate.set(date, isBridgeDay(date, region));
    }
    // Auch Tag NACH dem Zeitraum prüfen → relevant für "Tag-vor-Feiertag"-Effekt am 7. Tag.
    for (const date of dates) {
      const [yy, mm, dd] = date.split("-").map(Number);
      const next = new Date(Date.UTC(yy, mm - 1, dd) + 86_400_000).toISOString().slice(0, 10);
      const nextH = getHolidayForDate(next, region);
      if (nextH) dayBeforeHolidaySet.add(date);
    }
  }

  return dates.map((date) => {
    const dow = berlinDateKeyToDayOfWeek(date);
    const holidayName = holidayByDate.get(date) ?? null;
    const isHoliday = Boolean(holidayName);
    const isBridge = bridgeByDate.get(date) ?? false;
    const ctx: DayContext = {
      date,
      plannedShifts: plannedByDow.get(dow) ?? 0,
      historicalSameDay: histByDow.get(dow) ?? [],
      tempC: forecast.get(date)?.tempC ?? null,
      condition: forecast.get(date)?.condition ?? "unknown",
      industry,
      isHoliday,
      holidayName: holidayName ?? undefined,
      isBridgeDay: isBridge,
      isDayBeforeHoliday: dayBeforeHolidaySet.has(date),
    };
    const r = recommend(ctx);
    return {
      date,
      dayOfWeek: dow,
      recommendation: r,
      tone: recommendationTone(r, { isHoliday, industry }),
      holidayName,
      isBridge,
    };
  });
}
