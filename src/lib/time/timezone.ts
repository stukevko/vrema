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
  return Number(
    base.toLocaleString("en-GB", {
      timeZone: BERLIN_TZ,
      hour: "2-digit",
      hour12: false,
    })
  );
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

