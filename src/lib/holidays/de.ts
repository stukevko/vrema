/**
 * VREMA · Deutsche Feiertags-Engine (offline, deterministisch).
 *
 *  Wir verzichten bewusst auf einen API-Aufruf: alle gesetzlichen Feiertage
 *  in Deutschland lassen sich aus dem Jahr + Bundesland exakt ableiten
 *  (inkl. beweglicher Termine wie Karfreitag via Gauß-Osterformel).
 *
 *  Hinweis: regionale Sonderfeiertage (z. B. Augsburger Friedensfest, nur in Augsburg)
 *  werden bewusst weggelassen – sie sind keine Landes-Feiertage und würden
 *  die Empfehlung unnötig falsch positiv färben.
 */

export type GermanRegion =
  | "DE-BW"
  | "DE-BY"
  | "DE-BE"
  | "DE-BB"
  | "DE-HB"
  | "DE-HH"
  | "DE-HE"
  | "DE-MV"
  | "DE-NI"
  | "DE-NW"
  | "DE-RP"
  | "DE-SL"
  | "DE-SN"
  | "DE-ST"
  | "DE-SH"
  | "DE-TH";

export const GERMAN_REGION_LABELS: Record<GermanRegion, string> = {
  "DE-BW": "Baden-Württemberg",
  "DE-BY": "Bayern",
  "DE-BE": "Berlin",
  "DE-BB": "Brandenburg",
  "DE-HB": "Bremen",
  "DE-HH": "Hamburg",
  "DE-HE": "Hessen",
  "DE-MV": "Mecklenburg-Vorpommern",
  "DE-NI": "Niedersachsen",
  "DE-NW": "Nordrhein-Westfalen",
  "DE-RP": "Rheinland-Pfalz",
  "DE-SL": "Saarland",
  "DE-SN": "Sachsen",
  "DE-ST": "Sachsen-Anhalt",
  "DE-SH": "Schleswig-Holstein",
  "DE-TH": "Thüringen",
};

export type Holiday = {
  /** YYYY-MM-DD */
  date: string;
  name: string;
  /** true = bundesweit, false = nur bestimmte Bundesländer */
  isNationwide: boolean;
};

/** Gauß-Osterformel → liefert Ostersonntag-Datum. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fixed(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 *  Liefert ALLE Feiertage eines Jahres für ein Bundesland.
 *  Reihenfolge: chronologisch.
 */
export function listHolidays(year: number, region: GermanRegion): Holiday[] {
  const easter = easterSunday(year);
  const out: Array<Holiday & { regions?: GermanRegion[] }> = [];

  // ── Bundesweit ──────────────────────────────────────────────────────────
  out.push({ date: iso(fixed(year, 1, 1)), name: "Neujahr", isNationwide: true });
  out.push({ date: iso(addDays(easter, -2)), name: "Karfreitag", isNationwide: true });
  out.push({ date: iso(addDays(easter, 1)), name: "Ostermontag", isNationwide: true });
  out.push({ date: iso(fixed(year, 5, 1)), name: "Tag der Arbeit", isNationwide: true });
  out.push({ date: iso(addDays(easter, 39)), name: "Christi Himmelfahrt", isNationwide: true });
  out.push({ date: iso(addDays(easter, 50)), name: "Pfingstmontag", isNationwide: true });
  out.push({ date: iso(fixed(year, 10, 3)), name: "Tag der Deutschen Einheit", isNationwide: true });
  out.push({ date: iso(fixed(year, 12, 25)), name: "1. Weihnachtstag", isNationwide: true });
  out.push({ date: iso(fixed(year, 12, 26)), name: "2. Weihnachtstag", isNationwide: true });

  // ── Regional ────────────────────────────────────────────────────────────
  const addRegional = (when: Date, name: string, regions: GermanRegion[]) => {
    if (regions.includes(region)) {
      out.push({ date: iso(when), name, isNationwide: false });
    }
  };

  addRegional(fixed(year, 1, 6), "Heilige Drei Könige", ["DE-BW", "DE-BY", "DE-ST"]);
  addRegional(fixed(year, 3, 8), "Internationaler Frauentag", ["DE-BE", "DE-MV"]);
  addRegional(addDays(easter, 60), "Fronleichnam", [
    "DE-BW",
    "DE-BY",
    "DE-HE",
    "DE-NW",
    "DE-RP",
    "DE-SL",
  ]);
  addRegional(fixed(year, 8, 15), "Mariä Himmelfahrt", ["DE-BY", "DE-SL"]);
  addRegional(fixed(year, 9, 20), "Weltkindertag", ["DE-TH"]);
  addRegional(fixed(year, 10, 31), "Reformationstag", [
    "DE-BB",
    "DE-HB",
    "DE-HH",
    "DE-MV",
    "DE-NI",
    "DE-SN",
    "DE-ST",
    "DE-SH",
    "DE-TH",
  ]);
  addRegional(fixed(year, 11, 1), "Allerheiligen", [
    "DE-BW",
    "DE-BY",
    "DE-NW",
    "DE-RP",
    "DE-SL",
  ]);
  // Buß- und Bettag: Mittwoch vor dem letzten Sonntag des Kirchenjahres (vor 1. Advent).
  // Schnelle Lookup-Berechnung: 11 Tage vor dem 1. Advent → Mittwoch vor Totensonntag.
  const dec24 = fixed(year, 12, 24);
  const dec24Dow = (dec24.getUTCDay() + 6) % 7; // Mo=0 … So=6
  const firstAdvent = addDays(dec24, -((dec24Dow + 1) % 7) - 21);
  const bussTag = addDays(firstAdvent, -11);
  addRegional(bussTag, "Buß- und Bettag", ["DE-SN"]);

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Schnelltest: Ist der Tag in dieser Region ein Feiertag? */
export function getHolidayForDate(dateIso: string, region: GermanRegion): Holiday | null {
  const year = Number(dateIso.slice(0, 4));
  const list = listHolidays(year, region);
  return list.find((h) => h.date === dateIso) ?? null;
}

/**
 *  Brückentag = Werktag, der direkt zwischen Feiertag und Wochenende liegt
 *  (Mo zwischen Feiertag-So oder Fr zwischen Feiertag-Sa) bzw. zwischen
 *  zwei Feiertagen. Klassiker: Freitag nach Christi Himmelfahrt.
 *
 *  Auswirkung in der Gastro:
 *    - Vor Brückentag/Feiertag = oft Spitze (Leute machen Ausflug, gehen aus)
 *    - Brückentag selbst       = wenig Tagesgeschäft, viel Abend-/Wochenend-Profil
 */
export function isBridgeDay(dateIso: string, region: GermanRegion): boolean {
  const [y, m, d] = dateIso.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d));
  const dow = (day.getUTCDay() + 6) % 7; // Mo=0 … So=6

  // Nur Mo–Fr können „Brückentag" sein.
  if (dow > 4) return false;
  if (getHolidayForDate(dateIso, region)) return false;

  const yesterday = iso(addDays(day, -1));
  const tomorrow = iso(addDays(day, 1));
  const dayBefore = (day.getUTCDay() + 6 - 1 + 7) % 7;
  const dayAfter = (day.getUTCDay() + 6 + 1) % 7;

  // Mo: Feiertag am Di? Oder Wochenende davor + Feiertag am Mi (Brücke selten – ignorieren).
  // Klassisch: Mo nach Feiertag-So macht keinen Sinn (So ist eh frei) → erst dann „Brücke",
  // wenn Mo selbst zwischen So+Feiertag-Di liegt → Mo+Di kombiniert frei.
  if (dow === 0 && getHolidayForDate(tomorrow, region)) return true; // Mo + Di Feiertag
  if (dow === 4 && getHolidayForDate(yesterday, region)) return true; // Fr nach Feiertag-Do (Christi Himmelfahrt!)
  if (dow === 4 && getHolidayForDate(tomorrow, region)) return true; // Fr vor Feiertag-Sa (selten)
  if (dow === 1 && getHolidayForDate(yesterday, region)) return true; // Di nach Feiertag-Mo
  if (dow === 2 && getHolidayForDate(yesterday, region)) return true; // Mi nach Feiertag-Di
  // Falls wirklich Mi/Do Feiertag und benachbarte Tage zwischen Wochenende → seltene Spezialfälle ignorieren.

  void dayBefore;
  void dayAfter;
  return false;
}
