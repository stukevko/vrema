/**
 *  VREMA Native Core AI – Lern-Glue für die Schicht-Finalisierung.
 *
 *  Wird von `confirmAutopilotDrafts()` als fire-and-forget aufgerufen.
 *  Idee: wenn der Manager den Plan finalisiert hat, ist sein Endzustand
 *  unsere Grund-Wahrheit. Wir vergleichen die heutige Vorhersage pro
 *  Wochentag mit der tatsächlichen Schicht-Anzahl und passen die
 *  Faktoren in `AiWeights` an.
 *
 *  Wichtige Eigenschaften:
 *    - Idempotent: rerunning gleicher KW ist harmlos (lr → 0 mit Samples).
 *    - Robust: Fehler werden geloggt, aber nie geworfen (Publication darf nicht crashen).
 *    - DSGVO: nur aggregierte Zahlen, keine Personen-Daten.
 */

import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import {
  predictDemand,
  WEEKDAY_KEYS,
  type WeekdayKey,
  type WeatherKey,
  type EventKey,
  type ExperienceKey,
} from "@/lib/ai/core-engine";
import {
  recalibrateWeights,
  aggregateActualHeadcountPerWeekday,
  type RecalibrationResult,
} from "@/lib/ai/recalibrate";
import { recordTelemetry } from "@/lib/ai/learning-engine";
import { getWeeklyWeatherForCompanyMemoized } from "@/lib/external/weather";
import { isBridgeDay, getHolidayForDate, type GermanRegion } from "@/lib/holidays/de";
import { getBerlinDateKey, berlinDateKeyToDayOfWeek } from "@/lib/time/timezone";

export async function learnFromFinalizedWeek(
  companyId: string,
  weekIndex: number,
): Promise<RecalibrationResult> {
  // 1) Hole die soeben finalisierten Schichten.
  const finalShifts = await db.shift.findMany({
    where: tenantWhere(companyId, { weekIndex, isDraft: false }),
    select: { dayOfWeek: true, userId: true },
  });
  if (finalShifts.length === 0) {
    return { daysProcessed: 0, factorsUpdated: 0, movements: {} };
  }

  const actualByWeekday = aggregateActualHeadcountPerWeekday(finalShifts);

  // 2) Ermittle Kontext (Wetter / Feiertag / Experience) für den NÄCHSTEN Auftritt
  //    dieses Wochentages. Wir interpretieren „Manager hat finalisiert" als
  //    Aussage darüber, wie es ab heute laufen soll.
  const today = new Date();
  const todayKey = getBerlinDateKey(today);

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { region: true },
  });
  const region = (company?.region as GermanRegion | null) ?? null;

  const weather = await getWeeklyWeatherForCompanyMemoized(companyId).catch(() => ({
    daily: [] as Array<{ date: string; condition: string; maxTempC: number }>,
  }));

  // 3) Experience: simpler Indikator – durchschnittliche Account-Dauer der zugewiesenen User.
  //    > 12 Mon. = SENIOR_HEAVY, < 3 Mon. = JUNIOR_HEAVY, sonst BALANCED.
  const userIds = Array.from(new Set(finalShifts.map((s) => s.userId)));
  const users =
    userIds.length === 0
      ? []
      : await db.user.findMany({
          where: { id: { in: userIds }, companyId },
          select: { createdAt: true },
        });
  const experience: ExperienceKey = classifyExperience(users.map((u) => u.createdAt));

  // 4) Für jeden Wochentag: Datum des nächsten Auftritts ableiten und Kontext bestimmen.
  const days = [];
  for (const wk of WEEKDAY_KEYS) {
    const actual = actualByWeekday.get(wk);
    if (actual == null) continue;

    const dateIso = nextDateForWeekday(todayKey, wk);
    const eventKey = classifyEvent(dateIso, wk, region);
    const weatherKey = pickWeatherForDate(weather.daily, dateIso);

    const prediction = await predictDemand(companyId, {
      date: dateIso,
      weather: weatherKey,
      event: eventKey,
      experience,
    });

    days.push({
      prediction,
      actual,
      weather: weatherKey,
      event: eventKey,
      experience,
    });
  }

  if (days.length === 0) {
    return { daysProcessed: 0, factorsUpdated: 0, movements: {} };
  }

  // 5) Lernen.
  const result = await recalibrateWeights(companyId, days);

  // 6) Telemetrie (Audit-fähig). Fire-and-forget, schluckt Fehler.
  try {
    await recordTelemetry({
      companyId,
      kind: "SHIFT_PLAN_DEVIATION",
      modelTag: "native-core-v1",
      suggestion: {
        days: days.map((d) => ({
          date: d.prediction.date,
          weekday: d.prediction.weekday,
          predicted: d.prediction.rawHeadcount,
          breakdown: d.prediction.breakdown,
          weather: d.weather,
          event: d.event,
          experience: d.experience,
        })) as never,
      },
      actual: {
        days: days.map((d) => ({
          date: d.prediction.date,
          weekday: d.prediction.weekday,
          actual: d.actual,
        })) as never,
      },
      metrics: {
        factorsUpdated: result.factorsUpdated,
        daysProcessed: result.daysProcessed,
        movements: result.movements,
      } as never,
      referenceDate: new Date(),
    });
  } catch {
    /* fire-and-forget */
  }

  return result;
}

// ──────────────────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────────────────

function classifyExperience(createdAts: Date[]): ExperienceKey {
  if (createdAts.length === 0) return "UNKNOWN";
  const now = Date.now();
  const avgMonths =
    createdAts.reduce((acc, d) => acc + (now - d.getTime()) / (30 * 86_400_000), 0) /
    createdAts.length;
  if (avgMonths > 12) return "SENIOR_HEAVY";
  if (avgMonths < 3) return "JUNIOR_HEAVY";
  return "BALANCED";
}

function nextDateForWeekday(fromKey: string, weekday: WeekdayKey): string {
  const dow = berlinDateKeyToDayOfWeek(fromKey);
  const target: Record<WeekdayKey, number> = {
    SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
  };
  const diff = (target[weekday] - dow + 7) % 7;
  const [y, m, d] = fromKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + (diff === 0 ? 7 : diff)));
  return getBerlinDateKey(date);
}

function classifyEvent(dateIso: string, weekday: WeekdayKey, region: GermanRegion | null): EventKey {
  if (region) {
    const h = getHolidayForDate(dateIso, region);
    if (h) return "PUBLIC_HOLIDAY";
    if (isBridgeDay(dateIso, region)) return "BRIDGE_DAY";
    // Tag vor Feiertag?
    const next = new Date(`${dateIso}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const nextKey = getBerlinDateKey(next);
    if (getHolidayForDate(nextKey, region)) return "PUBLIC_HOLIDAY_EVE";
  }
  if (weekday === "SAT" || weekday === "SUN") return "WEEKEND";
  return "NONE";
}

function pickWeatherForDate(
  daily: Array<{ date: string; condition: string; maxTempC: number }>,
  dateIso: string,
): WeatherKey {
  const match = daily.find((d) => d.date === dateIso);
  if (!match) return "CLOUDY";
  const c = match.condition.toUpperCase();
  if (c === "RAIN" || c === "SNOW") return "RAIN";
  if (c === "CLEAR") {
    if (match.maxTempC > 28) return "HOT";
    return "SUNNY";
  }
  if (match.maxTempC < 5) return "COLD";
  return "CLOUDY";
}
