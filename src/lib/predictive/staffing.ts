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

export type IndustryProfile =
  | "RESTAURANT"
  | "CAFE"
  | "BAR"
  | "HOTEL"
  | "BAKERY"
  | "CANTEEN"
  | "CLUB"
  | "CATERING"
  | "OTHER";

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
  /** Branchen-Profil – steuert Wochentag- und Wetter-Sensitivität. */
  industry?: IndustryProfile;
  /** Ist heute ein gesetzlicher Feiertag in der Region? */
  isHoliday?: boolean;
  /** Klartext-Name des Feiertags (für Driver-Erklärung). */
  holidayName?: string;
  /** Brückentag (Werktag zwischen Feiertag und Wochenende). */
  isBridgeDay?: boolean;
  /** Tag direkt VOR einem Feiertag (häufig höhere Auslastung im Gastgewerbe und ähnlichen Betrieben). */
  isDayBeforeHoliday?: boolean;
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
  //   sunny + warm = höherer Druck (Außenbereiche, saisonale Betriebe)
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

/**
 *  Branchen-typisches Wochenprofil – Multiplikator pro Wochentag.
 *  Werte sind konservative Erfahrungswerte aus dem Dienstleistungs- und Schichtbetrieb, kalibriert branchenneutral.
 *  1.0 = neutral, > 1 = Spitze, < 1 = ruhiger.
 *
 *  Index: Mo=0, Di=1, Mi=2, Do=3, Fr=4, Sa=5, So=6
 */
function industryWeekdayProfile(industry: IndustryProfile | undefined): {
  weights: number[];
  weatherSensitivity: number;
  label: string;
} {
  switch (industry) {
    case "RESTAURANT":
      return {
        weights: [0.85, 0.85, 0.9, 1.05, 1.25, 1.35, 1.0],
        weatherSensitivity: 0.8,
        label: "Gastgewerbe (Mittag/Abend)",
      };
    case "CAFE":
      return {
        weights: [0.95, 0.95, 0.95, 1.0, 1.15, 1.35, 1.25],
        weatherSensitivity: 1.3,
        label: "Café / Tagesgastronomie",
      };
    case "BAR":
      return {
        weights: [0.55, 0.55, 0.7, 0.9, 1.45, 1.6, 0.75],
        weatherSensitivity: 0.6,
        label: "Abend- & Nachtbetrieb",
      };
    case "HOTEL":
      return {
        weights: [1.0, 1.0, 1.05, 1.1, 1.2, 1.2, 1.05],
        weatherSensitivity: 0.4,
        label: "Hotel-Profil",
      };
    case "BAKERY":
      return {
        weights: [1.2, 1.15, 1.15, 1.15, 1.2, 1.3, 0.85],
        weatherSensitivity: 0.3,
        label: "Bäckerei-Profil",
      };
    case "CANTEEN":
      return {
        weights: [1.15, 1.15, 1.15, 1.15, 1.05, 0.3, 0.2],
        weatherSensitivity: 0.1,
        label: "Kantinen-Profil",
      };
    case "CLUB":
      return {
        weights: [0.0, 0.0, 0.05, 0.15, 1.3, 1.6, 0.4],
        weatherSensitivity: 0.3,
        label: "Club-Profil",
      };
    case "CATERING":
      return {
        weights: [0.9, 0.9, 0.9, 1.0, 1.2, 1.3, 1.1],
        weatherSensitivity: 0.2,
        label: "Catering-Profil",
      };
    case "OTHER":
    default:
      return {
        weights: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
        weatherSensitivity: 1.0,
        label: "Standard-Profil",
      };
  }
}

/** Mo=0 … So=6 für ein YYYY-MM-DD. */
function isoWeekday(dateIso: string): number {
  const [y, m, d] = dateIso.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d));
  return (day.getUTCDay() + 6) % 7;
}

export function recommend(ctx: DayContext): StaffingRecommendation {
  const histMedian = median(ctx.historicalSameDay);
  const expectedShifts = Math.max(0, histMedian);

  // Basis-Auslastung anhand historischer Schichten (Saturation bei ~12 Schichten).
  const baseUtilization = Math.min(1, expectedShifts / 12);
  const { index: rawWeatherIdx, label: weatherLabel } = weatherIndex(ctx);

  // Branchen-Profil: Wochentag-Multiplikator + Wetter-Sensitivität.
  const profile = industryWeekdayProfile(ctx.industry);
  const wdMultiplier = profile.weights[isoWeekday(ctx.date)] ?? 1.0;
  const wIdx = rawWeatherIdx * profile.weatherSensitivity;

  // ── Feiertags-Effekte ────────────────────────────────────────────────────
  // Auf einen gesetzlichen Feiertag:
  //   Hotel / Gastgewerbe / Café = oft geöffnet mit eher Sonntags-Profil
  //   Kantine/Bäckerei  = meist geschlossen
  //   Club / Nachtbetrieb = je nach Anlass variabel
  let holidayImpact = 0;
  let holidayLabel = "";
  if (ctx.isHoliday) {
    holidayLabel = `Feiertag${ctx.holidayName ? ` · ${ctx.holidayName}` : ""}`;
    switch (ctx.industry) {
      case "CANTEEN":
      case "BAKERY":
        holidayImpact = -0.9; // praktisch geschlossen
        break;
      case "CATERING":
        holidayImpact = -0.3;
        break;
      case "BAR":
      case "CLUB":
        holidayImpact = 0.1;
        break;
      case "RESTAURANT":
      case "CAFE":
      case "HOTEL":
      default:
        holidayImpact = -0.15; // leichter Rückgang, aber offen
    }
  }

  let bridgeImpact = 0;
  let bridgeLabel = "";
  if (ctx.isBridgeDay && !ctx.isHoliday) {
    bridgeLabel = "Brückentag";
    // Brückentag = Werktag, der wie Wochenende wirkt.
    // Cafés / Gastgewerbe / Hotels typischerweise voller.
    switch (ctx.industry) {
      case "CANTEEN":
        bridgeImpact = -0.7;
        break;
      case "RESTAURANT":
      case "CAFE":
      case "HOTEL":
        bridgeImpact = 0.2;
        break;
      case "BAR":
      case "CLUB":
        bridgeImpact = 0.25;
        break;
      default:
        bridgeImpact = 0.1;
    }
  }

  let dayBeforeImpact = 0;
  let dayBeforeLabel = "";
  if (ctx.isDayBeforeHoliday && !ctx.isHoliday) {
    dayBeforeLabel = "Tag vor Feiertag";
    // Klassischer Mehr-Effekt: „Wir gehen heute schön essen, morgen ist frei."
    switch (ctx.industry) {
      case "RESTAURANT":
      case "BAR":
      case "CLUB":
      case "CAFE":
        dayBeforeImpact = 0.18;
        break;
      case "HOTEL":
        dayBeforeImpact = 0.1;
        break;
      default:
        dayBeforeImpact = 0.05;
    }
  }

  const adjustedBase = baseUtilization * wdMultiplier;
  const expectedUtilization = Math.max(
    0,
    Math.min(1, adjustedBase + wIdx + holidayImpact + bridgeImpact + dayBeforeImpact),
  );

  // Sonderfall „Geschäft praktisch geschlossen": empfehle 0 Schichten, klare Aussage.
  if (ctx.isHoliday && (ctx.industry === "CANTEEN" || ctx.industry === "BAKERY")) {
    return {
      expectedUtilization: 0.05,
      delta: -ctx.plannedShifts,
      confidence: 0.9,
      drivers: [
        { label: holidayLabel, impact: -1 },
        { label: profile.label, impact: 0 },
      ],
    };
  }

  // Delta: erwartete vs. geplante Schichten.
  const rawDelta =
    expectedShifts * wdMultiplier * (1 + wIdx + holidayImpact + bridgeImpact + dayBeforeImpact) -
    ctx.plannedShifts;
  const delta = Math.round(rawDelta);

  // Confidence: viel Historie + bekanntes Wetter = höher. Feiertags-Kontext erhöht ebenfalls.
  const histSample = Math.min(1, ctx.historicalSameDay.length / 4);
  const weatherConf = ctx.condition && ctx.condition !== "unknown" ? 1 : 0.5;
  const contextBonus = ctx.isHoliday || ctx.isBridgeDay ? 0.2 : 0;
  const confidence = Math.max(
    0.1,
    Math.min(1, 0.4 * histSample + 0.4 * weatherConf + contextBonus + (ctx.industry ? 0.1 : 0)),
  );

  const drivers: StaffingRecommendation["drivers"] = [];
  if (holidayLabel) drivers.push({ label: holidayLabel, impact: holidayImpact });
  if (bridgeLabel) drivers.push({ label: bridgeLabel, impact: bridgeImpact });
  if (dayBeforeLabel) drivers.push({ label: dayBeforeLabel, impact: dayBeforeImpact });
  drivers.push({ label: profile.label, impact: wdMultiplier - 1 });
  drivers.push({ label: `Historie (Median: ${histMedian.toFixed(1)} Schichten)`, impact: baseUtilization });
  drivers.push({ label: weatherLabel, impact: wIdx });
  drivers.push({
    label: `Aktuell geplant: ${ctx.plannedShifts}`,
    impact: ctx.plannedShifts > 0 ? -ctx.plannedShifts / 24 : 0,
  });

  return { expectedUtilization, delta, confidence, drivers };
}

/**
 *  UI-Hilfsfunktion: leitet aus Empfehlung + Kontext den Pillen-Ton ab.
 *  Werte: "closed" (Feiertag/keine Planung), "calm", "watch", "urgent".
 */
export function recommendationTone(
  r: StaffingRecommendation,
  ctx?: Pick<DayContext, "isHoliday" | "industry">,
): "closed" | "calm" | "watch" | "urgent" {
  if (
    ctx?.isHoliday &&
    (ctx.industry === "CANTEEN" || ctx.industry === "BAKERY")
  ) {
    return "closed";
  }
  if (r.delta >= 2) return "urgent";
  if (r.delta >= 1) return "watch";
  return "calm";
}
