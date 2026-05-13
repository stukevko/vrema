/**
 *  Predictive-Staffing v1 (regelbasiert, ehrlich).
 *
 *  Wir vermeiden bewusst eine ML-Black-Box: V1 leitet eine deterministische
 *  Empfehlung aus zwei Eingaben ab:
 *
 *    1. Wetter-Index — 0..1 (gut/warm = höherer Druck im Außenbereich)
 *    2. Historische Schichtdichte — wie viele Schichten der gleiche Wochentag
 *       in den letzten 4 Wochen hatte (Median).
 *
 *  Output: Auslastungs-Score 0..1 + Empfehlung "Hold / +1 / -1 / Aufmerksamkeit".
 *  Die UI rendert daraus die Pille im Planer und den Reasoning-Drawer.
 *
 *  Bewusste Designentscheidung: Wir liefern ein Score-Objekt mit `confidence`,
 *  damit die UI bei wenig Datenlage ("nur 1 Vorwoche") sichtbar zurückhaltender ist.
 */

export type WeatherCondition = "sunny" | "cloudy" | "rainy" | "stormy" | "snow" | "unknown";

export type DayContext = {
  /** YYYY-MM-DD */
  date: string;
  /** Anzahl geplanter Schichten heute */
  plannedShifts: number;
  /** Schicht-Counts der letzten 4 gleichen Wochentage (kann auch leer sein). */
  historicalSameDay: number[];
  /** Mittagstemperatur in °C, optional. */
  tempC?: number | null;
  condition?: WeatherCondition;
};

export type StaffingRecommendation = {
  /** 0..1, je höher desto mehr erwartete Auslastung. */
  expectedUtilization: number;
  /** Empfehlung: positiv = mehr Personal nötig, negativ = entspannt. */
  delta: number;
  /** 0..1, Datenqualität der Empfehlung. */
  confidence: number;
  /** Erklärbare Liste von Faktoren („Sonnig, +0.15"). */
  drivers: Array<{ label: string; impact: number }>;
};

function weatherIndex(c: DayContext): { index: number; label: string } {
  // Heuristik:
  //   sunny + warm = höherer Druck (Terrasse, Eis-Cafés voll)
  //   rainy = neutral/leicht negativ
  //   stormy/snow = deutlich negativ
  let idx = 0;
  let label = "Unbekanntes Wetter";
  switch (c.condition) {
    case "sunny":
      idx += 0.18;
      label = "Sonnig";
      break;
    case "cloudy":
      idx += 0.04;
      label = "Bewölkt";
      break;
    case "rainy":
      idx -= 0.05;
      label = "Regen";
      break;
    case "stormy":
      idx -= 0.15;
      label = "Sturm";
      break;
    case "snow":
      idx -= 0.1;
      label = "Schnee";
      break;
    default:
      idx += 0;
  }
  if (typeof c.tempC === "number") {
    if (c.tempC >= 25) {
      idx += 0.12;
      label += " · sehr warm";
    } else if (c.tempC >= 18) {
      idx += 0.06;
      label += " · mild";
    } else if (c.tempC <= 5) {
      idx -= 0.05;
      label += " · kalt";
    }
  }
  return { index: idx, label };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function recommend(ctx: DayContext): StaffingRecommendation {
  const histMedian = median(ctx.historicalSameDay);
  const expectedShifts = Math.max(0, histMedian);

  // Basis-Auslastung anhand historischer Schichten (Saturation bei ~12 Schichten).
  const baseUtilization = Math.min(1, expectedShifts / 12);
  const { index: wIdx, label: weatherLabel } = weatherIndex(ctx);

  // Final-Score: gewichtete Summe, geclamped.
  const expectedUtilization = Math.max(0, Math.min(1, baseUtilization + wIdx));

  // Delta: erwartete vs. geplante Schichten. Aufgerundet, weil "1 Person fehlt"
  // immer ein ganzes Ticket ist.
  const rawDelta = expectedShifts * (1 + wIdx) - ctx.plannedShifts;
  const delta = Math.round(rawDelta);

  // Confidence: viel Historie + bekanntes Wetter = höher.
  const histSample = Math.min(1, ctx.historicalSameDay.length / 4);
  const weatherConf = ctx.condition && ctx.condition !== "unknown" ? 1 : 0.5;
  const confidence = Math.max(0.1, Math.min(1, 0.5 * histSample + 0.5 * weatherConf));

  const drivers: StaffingRecommendation["drivers"] = [
    { label: `Historie (Median: ${histMedian.toFixed(1)} Schichten)`, impact: baseUtilization },
    { label: weatherLabel, impact: wIdx },
    { label: `Aktuell geplant: ${ctx.plannedShifts}`, impact: ctx.plannedShifts > 0 ? -ctx.plannedShifts / 24 : 0 },
  ];

  return { expectedUtilization, delta, confidence, drivers };
}

/** UI-Hilfsfunktion: ableiten, ob Empfehlungs-Pille rot/amber/grün wird. */
export function recommendationTone(r: StaffingRecommendation): "calm" | "watch" | "urgent" {
  if (r.delta >= 2) return "urgent";
  if (r.delta >= 1) return "watch";
  return "calm";
}
