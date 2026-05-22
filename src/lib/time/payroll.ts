import {
  daysBetweenBerlinDateKeys,
  getBerlinDateKey,
  getBerlinWallClockMinutes,
} from "@/lib/time/timezone";

export type WorkLogLike = {
  clockIn: Date | string;
  clockOut: Date | string | null;
  breakMins: number;
};

const MINUTES_PER_DAY = 24 * 60;

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Netto-Arbeitsminuten (Europe/Berlin).
 *
 * - Gleicher Berlin-Kalendertag: reine Wanduhr-Differenz (kein UTC-Tageswechsel-Phantom).
 * - Ausstempeln genau +1 Tag mit späterer Uhrzeit: typischer +24h-DB-Bug → Wanduhr auf Starttag.
 * - Echte Nachtschicht (Start ≥ 22:00, Ende am Folgetag früh): Mitternachts-Spanne.
 * - Sonst: UTC-Instant-Differenz (mehrtägig / Sonderfälle).
 */
export function workedMinutes(log: WorkLogLike): number {
  if (!log.clockOut) return 0;

  const start = toDate(log.clockIn);
  const end = toDate(log.clockOut);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return 0;

  const breakNorm = Math.max(0, Math.floor(log.breakMins || 0));
  const startKey = getBerlinDateKey(start);
  const endKey = getBerlinDateKey(end);
  const startM = getBerlinWallClockMinutes(start);
  const endM = getBerlinWallClockMinutes(end);

  if (startKey === endKey) {
    const gross =
      endM >= startM ? endM - startM : MINUTES_PER_DAY - startM + endM;
    return Math.max(0, gross - breakNorm);
  }

  const dayDiff = daysBetweenBerlinDateKeys(startKey, endKey);

  if (dayDiff === 1) {
    if (endM >= startM) {
      const wallGross = endM - startM;
      const utcGross = Math.round((end.getTime() - start.getTime()) / 60_000);
      if (
        wallGross > 0 &&
        wallGross <= 16 * 60 &&
        utcGross >= wallGross + 23 * 60 &&
        utcGross <= wallGross + 25 * 60
      ) {
        return Math.max(0, wallGross - breakNorm);
      }
      if (wallGross > 0 && wallGross <= 16 * 60) {
        return Math.max(0, wallGross - breakNorm);
      }
    }

    if (startM >= 22 * 60 && endM <= 8 * 60) {
      const gross = MINUTES_PER_DAY - startM + endM;
      return Math.max(0, gross - breakNorm);
    }
  }

  if (end.getTime() <= start.getTime()) return 0;
  const utcGross = Math.round((end.getTime() - start.getTime()) / 60_000);
  return Math.max(0, utcGross - breakNorm);
}

export function sumWorkedMinutes<T extends WorkLogLike>(logs: T[]): number {
  return logs.reduce((sum, log) => sum + workedMinutes(log), 0);
}

export function minutesToDecimalHours(minutes: number, scale = 2): string {
  return (minutes / 60).toFixed(scale);
}

export function wageTypeForMinutes(minutes: number): { code: "001" | "002"; text: string } {
  if (minutes > 0) return { code: "001", text: "Arbeitszeit" };
  return { code: "001", text: "Arbeitszeit" };
}
