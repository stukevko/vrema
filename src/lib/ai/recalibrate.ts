/**
 *  VREMA Native Core AI – Feedback-Schleife (Online-Learning).
 *
 *  Lernregel (stochastic gradient style):
 *
 *    error      = actual / predicted - 1            (z. B. +0.20 = 20 % zu wenig)
 *    learnRate  = 1 / sqrt(sampleCount + 1)         (Glättung über Zeit)
 *    newWeight  = clamp(oldWeight * (1 + learnRate * error))
 *
 *  Eigenschaften:
 *    - Beim ersten Sample: voller Einfluss (lr = 1.0)
 *    - Nach 25 Samples: nur noch 0.2 (Stabilität)
 *    - Faktoren sind auf [0.3 .. 3.0] geklemmt (verhindert Runaway)
 *
 *  Wir lernen also *gemeinsam* an allen vier Dimensionen, mit dem identischen
 *  Fehler-Signal pro Tag. Das ist konsistent mit der multiplikativen Formel:
 *  bewegen wir alle Faktoren in dieselbe Richtung, konvergiert das Produkt
 *  schneller als jeder Einzelfaktor (no-regret style).
 */

import { db } from "@/lib/db";
import { DIMENSIONS, clampWeight, type Prediction, type WeekdayKey } from "@/lib/ai/core-engine";

export type RecalibrationDay = {
  /** Original-Vorhersage (vor Realität). */
  prediction: Prediction;
  /** Tatsächliche Headcount-Zahl, die der Manager final eingeplant hat. */
  actual: number;
  /** Welche Buckets sind beim Lernen aktiv? Müssen mit der Prediction übereinstimmen. */
  weather: string;
  event: string;
  experience: string;
};

export type RecalibrationResult = {
  daysProcessed: number;
  factorsUpdated: number;
  /** Verteilung der Korrektur-Beträge pro Dimension – nur Diagnose. */
  movements: Record<string, number>;
};

/**
 *  Hauptfunktion: nimmt alle Tage einer Woche, vergleicht Vorhersage vs. Realität,
 *  und passt die `AiWeights`-Faktoren an.
 *
 *  Caller verifiziert vorher Tenant & Rolle.
 *  Wird typischerweise direkt nach `confirmAutopilotDrafts()` aufgerufen.
 */
export async function recalibrateWeights(
  companyId: string,
  days: RecalibrationDay[],
): Promise<RecalibrationResult> {
  if (days.length === 0) {
    return { daysProcessed: 0, factorsUpdated: 0, movements: {} };
  }

  const movements: Record<string, number> = {};
  let factorsUpdated = 0;

  // Wir verarbeiten Tage sequentiell, um upsert-Races im selben Tenant zu vermeiden.
  for (const day of days) {
    const predicted = Math.max(0.5, day.prediction.rawHeadcount);
    const actual = Math.max(0, day.actual);
    if (predicted === 0) continue;

    const error = actual / predicted - 1;

    // Plausibilitäts-Limit: extreme Ausreißer (z. B. krasser Krankenstand) sollen
    // das Modell nicht ruinieren. Wir cappen den Lerneinfluss bei ±50 %.
    const cappedError = Math.max(-0.5, Math.min(0.5, error));

    const updates: Array<{ dim: string; key: string }> = [
      { dim: DIMENSIONS.HISTORY_WEEKDAY, key: day.prediction.weekday },
      { dim: DIMENSIONS.WEATHER, key: day.weather },
      { dim: DIMENSIONS.EVENT, key: day.event },
      { dim: DIMENSIONS.EXPERIENCE, key: day.experience },
    ];

    for (const u of updates) {
      const result = await applyOnlineUpdate(companyId, u.dim, u.key, cappedError);
      factorsUpdated += 1;
      movements[u.dim] = (movements[u.dim] ?? 0) + Math.abs(result.delta);
    }
  }

  return {
    daysProcessed: days.length,
    factorsUpdated,
    movements,
  };
}

/**
 *  Einzelner Online-Update-Step für (dimension, key).
 *  Idempotent in dem Sinne, dass es bei error=0 nichts ändert.
 */
async function applyOnlineUpdate(
  companyId: string,
  dimension: string,
  key: string,
  error: number,
): Promise<{ delta: number; newWeight: number; sampleCount: number }> {
  const existing = await db.aiWeights.findUnique({
    where: { companyId_dimension_key: { companyId, dimension, key } },
    select: { weight: true, sampleCount: true },
  });
  const prevWeight = existing?.weight ?? 1.0;
  const prevSamples = existing?.sampleCount ?? 0;

  const learnRate = 1 / Math.sqrt(prevSamples + 1);
  const candidate = prevWeight * (1 + learnRate * error);
  const newWeight = clampWeight(candidate);
  const delta = newWeight - prevWeight;

  await db.aiWeights.upsert({
    where: { companyId_dimension_key: { companyId, dimension, key } },
    create: {
      companyId,
      dimension,
      key,
      weight: newWeight,
      sampleCount: 1,
      lastError: error,
    },
    update: {
      weight: newWeight,
      sampleCount: { increment: 1 },
      lastError: error,
    },
  });

  return { delta, newWeight, sampleCount: prevSamples + 1 };
}

/**
 *  Reine Hilfsfunktion: kapselt das Mapping „der Manager hat finalisiert" → Lerndaten.
 *  Nimmt die für die KW geplanten/finalisierten Schichten und destilliert pro Wochentag
 *  einen Tages-Actual.
 */
export type FinalShiftRow = {
  dayOfWeek: number; // 0=Sun..6=Sat
};
export function aggregateActualHeadcountPerWeekday(
  finalShifts: FinalShiftRow[],
): Map<WeekdayKey, number> {
  const map = new Map<WeekdayKey, number>();
  const labels: WeekdayKey[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  for (const s of finalShifts) {
    const key = labels[s.dayOfWeek] ?? "MON";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}
