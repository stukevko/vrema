import { getDayBoundsUtc } from "@/lib/time/timezone";

const BERLIN = "Europe/Berlin";

/** Kalendertag (Berlin) als UTC-Instant: Beginn des lokalen Tages. */
export function berlinStartOfDayFromInstant(instant: Date): Date {
  return getDayBoundsUtc(BERLIN, instant).start;
}

/** `YYYY-MM-DD` interpretiert als Berliner Datum (mittags = kein DST-Randfall). */
export function berlinStartOfDayFromIsoDate(isoDate: string): Date {
  const parsed = new Date(`${isoDate}T12:00:00`);
  return getDayBoundsUtc(BERLIN, parsed).start;
}
