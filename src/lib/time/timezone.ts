const BERLIN_TZ = "Europe/Berlin";

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function extractParts(date: Date, timeZone: string): ZonedParts {
  const parts = getFormatter(timeZone).formatToParts(date);
  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function getOffsetMs(instant: Date, timeZone: string) {
  const p = extractParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, 0);
  return asUtc - instant.getTime();
}

function zonedDateTimeToUtc(parts: ZonedParts, timeZone: string) {
  let guess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, 0);
  for (let i = 0; i < 3; i += 1) {
    const offset = getOffsetMs(new Date(guess), timeZone);
    guess -= offset;
  }
  return new Date(guess);
}

export function getDayBoundsUtc(timeZone = BERLIN_TZ, base = new Date()) {
  const p = extractParts(base, timeZone);
  const start = zonedDateTimeToUtc({ ...p, hour: 0, minute: 0, second: 0 }, timeZone);
  const end = zonedDateTimeToUtc({ ...p, hour: 23, minute: 59, second: 59 }, timeZone);
  return { start, end: new Date(end.getTime() + 999) };
}

export function getMonthBoundsUtc(year: number, monthOneBased: number, timeZone = BERLIN_TZ) {
  const start = zonedDateTimeToUtc(
    { year, month: monthOneBased, day: 1, hour: 0, minute: 0, second: 0 },
    timeZone
  );
  const nextMonth = monthOneBased === 12 ? { year: year + 1, month: 1 } : { year, month: monthOneBased + 1 };
  const endExclusive = zonedDateTimeToUtc(
    { year: nextMonth.year, month: nextMonth.month, day: 1, hour: 0, minute: 0, second: 0 },
    timeZone
  );
  return { start, endExclusive };
}

export function formatBerlinDate(date: Date, options?: Intl.DateTimeFormatOptions) {
  return date.toLocaleDateString("de-DE", { timeZone: BERLIN_TZ, ...options });
}

export function formatBerlinTime(date: Date, options?: Intl.DateTimeFormatOptions) {
  return date.toLocaleTimeString("de-DE", { timeZone: BERLIN_TZ, ...options });
}

export function getBerlinNowHour(base = new Date()) {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: BERLIN_TZ,
    hour: "numeric",
    hour12: false,
  }).formatToParts(base);
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  return Number.isFinite(hour) ? hour : 0;
}

/**
 * Baut aus einem Basis-Datum + Uhrzeit "HH:MM" eine `Date`-Instanz, die dem
 * Wandkalender in `Europe/Berlin` entspricht – DST-sicher.
 *
 * Hintergrund: `baseDate.setHours(h, m)` operiert in der **lokalen Zeitzone
 * des Node-Prozesses**, was auf UTC-Servern zu falschen Schicht-Starts führt.
 */
export function parseBerlinShiftStart(baseDate: Date, hhmm: string): Date | null {
  const [hRaw, mRaw] = hhmm.split(":");
  const hour = Number(hRaw);
  const minute = Number(mRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;

  const p = extractParts(baseDate, BERLIN_TZ);
  return zonedDateTimeToUtc(
    { year: p.year, month: p.month, day: p.day, hour, minute, second: 0 },
    BERLIN_TZ,
  );
}

/** Kalendertag in Europe/Berlin um N Tage verschieben (für Schicht-Ende nach Mitternacht). */
export function addBerlinCalendarDays(baseDate: Date, days: number): Date {
  const key = getBerlinDateKey(baseDate);
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
}

/**
 * Schicht-Ende in Berlin: liegt die End-Uhrzeit vor der Start-Uhrzeit am selben Tag,
 * gilt die Schicht als Nachtschicht über Mitternacht → Ende am Folgetag.
 */
export function parseBerlinShiftEnd(baseDate: Date, endHhmm: string, startHhmm: string): Date | null {
  const start = parseBerlinShiftStart(baseDate, startHhmm);
  let end = parseBerlinShiftStart(baseDate, endHhmm);
  if (!end) return null;
  if (start && end.getTime() <= start.getTime()) {
    end = parseBerlinShiftStart(addBerlinCalendarDays(baseDate, 1), endHhmm);
  }
  return end;
}

/**
 * Parst `datetime-local` / `YYYY-MM-DDTHH:mm` als Europe/Berlin-Wandzeit (DST-sicher).
 * Verhindert +24h-Drift, wenn der Server in UTC läuft.
 */
export function parseDateTimeLocalBerlin(value: string): Date | null {
  const trimmed = value.trim();
  const localMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (localMatch) {
    const year = Number(localMatch[1]);
    const month = Number(localMatch[2]);
    const day = Number(localMatch[3]);
    const hour = Number(localMatch[4]);
    const minute = Number(localMatch[5]);
    const second = localMatch[6] ? Number(localMatch[6]) : 0;
    if ([year, month, day, hour, minute, second].some((n) => !Number.isFinite(n))) return null;
    return zonedDateTimeToUtc({ year, month, day, hour, minute, second }, BERLIN_TZ);
  }
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getBerlinWallClockMinutes(date: Date): number {
  const p = extractParts(date, BERLIN_TZ);
  return p.hour * 60 + p.minute;
}

export function daysBetweenBerlinDateKeys(startKey: string, endKey: string): number {
  const [sy, sm, sd] = startKey.split("-").map(Number);
  const [ey, em, ed] = endKey.split("-").map(Number);
  const startUtc = Date.UTC(sy, sm - 1, sd);
  const endUtc = Date.UTC(ey, em - 1, ed);
  return Math.round((endUtc - startUtc) / (24 * 60 * 60 * 1000));
}

export function getBerlinDateKey(date: Date) {
  return date.toLocaleDateString("en-CA", {
    timeZone: BERLIN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function getBerlinDayBoundsUtc(base: Date) {
  return getDayBoundsUtc(BERLIN_TZ, base);
}

export function countBerlinCalendarDaysInclusive(start: Date, end: Date) {
  const startKey = getBerlinDateKey(start);
  const endKey = getBerlinDateKey(end);
  const [sy, sm, sd] = startKey.split("-").map(Number);
  const [ey, em, ed] = endKey.split("-").map(Number);
  const startUtc = Date.UTC(sy, sm - 1, sd);
  const endUtc = Date.UTC(ey, em - 1, ed);
  const diffDays = Math.floor((endUtc - startUtc) / (24 * 60 * 60 * 1000));
  return Math.max(1, diffDays + 1);
}

export function listBerlinDateKeysInclusive(start: Date, end: Date) {
  const keys: string[] = [];
  const startKey = getBerlinDateKey(start);
  const endKey = getBerlinDateKey(end);
  const [sy, sm, sd] = startKey.split("-").map(Number);
  const [ey, em, ed] = endKey.split("-").map(Number);
  let cursor = Date.UTC(sy, sm - 1, sd);
  const endUtc = Date.UTC(ey, em - 1, ed);
  while (cursor <= endUtc) {
    const d = new Date(cursor);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    keys.push(`${y}-${m}-${day}`);
    cursor += 24 * 60 * 60 * 1000;
  }
  return keys;
}

export function berlinDateKeyToDayOfWeek(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function berlinDateKeyAddDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  const ny = next.getUTCFullYear();
  const nm = String(next.getUTCMonth() + 1).padStart(2, "0");
  const nd = String(next.getUTCDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

/** ISO-Kalenderwoche (1–53) für ein Datum in Europe/Berlin. */
export function getBerlinIsoWeekNumber(reference = new Date()): number {
  const key = getBerlinDateKey(reference);
  const [y, m, d] = key.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1, d));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = (target.getTime() - firstThursday.getTime()) / 86_400_000;
  return 1 + Math.floor(diff / 7);
}

/** Montag 00:00 bis nächster Montag 00:00 (exclusive), Europe/Berlin. */
export function getIsoWeekBoundsUtc(reference = new Date(), timeZone = BERLIN_TZ) {
  const key = getBerlinDateKey(reference);
  const dow = berlinDateKeyToDayOfWeek(key);
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const mondayKey = berlinDateKeyAddDays(key, -daysFromMonday);
  const nextMondayKey = berlinDateKeyAddDays(mondayKey, 7);

  const [y1, m1, d1] = mondayKey.split("-").map(Number);
  const [y2, m2, d2] = nextMondayKey.split("-").map(Number);
  const start = zonedDateTimeToUtc(
    { year: y1, month: m1, day: d1, hour: 0, minute: 0, second: 0 },
    timeZone,
  );
  const endExclusive = zonedDateTimeToUtc(
    { year: y2, month: m2, day: d2, hour: 0, minute: 0, second: 0 },
    timeZone,
  );
  return { start, endExclusive, mondayKey, weekNumber: getBerlinIsoWeekNumber(reference) };
}

