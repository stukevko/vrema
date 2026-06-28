import {
  daysBetweenBerlinDateKeys,
  getBerlinDateKey,
  getBerlinWallClockMinutes,
} from "@/lib/time/timezone";
import { resolveEffectiveBreakMins } from "@/lib/time/auto-break";

export type WorkLogLike = {
  clockIn: Date | string;
  clockOut: Date | string | null;
  breakMins: number;
};

const MINUTES_PER_DAY = 24 * 60;
/** Unterhalb: typischer Unix-Epoch-/Import-Müll (1970). */
const MIN_VALID_INSTANT_MS = Date.UTC(1990, 0, 1);
/** Dashboard-KPI: pro Log maximal eine Kalenderschicht. */
const MAX_COST_ESTIMATE_MINUTES = MINUTES_PER_DAY;

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function isValidWorkInstant(value: Date | string | null | undefined): boolean {
  if (value == null) return false;
  const t = toDate(value).getTime();
  return Number.isFinite(t) && t >= MIN_VALID_INSTANT_MS;
}

function capCostEstimateMinutes(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return Math.min(minutes, MAX_COST_ESTIMATE_MINUTES);
}

/** Brutto-Arbeitsminuten ohne Pausenabzug (Europe/Berlin, gleiche Spanne wie `workedMinutes`). */
export function grossWorkedMinutes(log: WorkLogLike): number {
  if (!log.clockOut) return 0;

  const start = toDate(log.clockIn);
  const end = toDate(log.clockOut);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return 0;

  const startKey = getBerlinDateKey(start);
  const endKey = getBerlinDateKey(end);
  const startM = getBerlinWallClockMinutes(start);
  const endM = getBerlinWallClockMinutes(end);

  if (startKey === endKey) {
    const gross =
      endM >= startM ? endM - startM : MINUTES_PER_DAY - startM + endM;
    return Math.max(0, gross);
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
        return Math.max(0, wallGross);
      }
      if (wallGross > 0 && wallGross <= 16 * 60) {
        return Math.max(0, wallGross);
      }
    }

    if (startM >= 22 * 60 && endM <= 8 * 60) {
      const gross = MINUTES_PER_DAY - startM + endM;
      return Math.max(0, gross);
    }
  }

  if (end.getTime() <= start.getTime()) return 0;
  const utcGross = Math.round((end.getTime() - start.getTime()) / 60_000);
  return Math.max(0, utcGross);
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

  const gross = grossWorkedMinutes(log);
  if (gross <= 0) return 0;

  const breakNorm = resolveEffectiveBreakMins(log, undefined, gross);
  return Math.max(0, gross - breakNorm);
}

export function sumWorkedMinutes<T extends WorkLogLike>(logs: T[]): number {
  return logs.reduce((sum, log) => sum + workedMinutes(log), 0);
}

/**
 * Arbeitsminuten für Live-Kosten (Dashboard „Heutige Personalkosten“).
 *
 * - Offene Schicht (`clockOut` null): nur clockIn → jetzt (Berlin/+24h via `workedMinutes`).
 * - Ungültiges `clockOut` (Epoch, NaN, vor clockIn): 0 — kein Fallback auf now oder 1970.
 */
export function workedMinutesForCostEstimate(log: WorkLogLike, now: Date = new Date()): number {
  if (!isValidWorkInstant(log.clockIn)) return 0;

  const start = toDate(log.clockIn);
  const isOpen = log.clockOut == null;

  if (isOpen) {
    if (!isValidWorkInstant(now) || now.getTime() <= start.getTime()) return 0;
    return capCostEstimateMinutes(
      workedMinutes({ clockIn: log.clockIn, clockOut: now, breakMins: log.breakMins }),
    );
  }

  const clockOut = log.clockOut;
  if (clockOut == null || !isValidWorkInstant(clockOut)) return 0;
  const end = toDate(clockOut);
  if (end.getTime() <= start.getTime()) return 0;

  return capCostEstimateMinutes(workedMinutes(log));
}

export type WorkLogWithHourlyWage = WorkLogLike & {
  user: { hourlyWage: number | null };
};

/** Brutto-Personalkosten in Euro (nicht Cent) für eine Log-Liste. */
export function sumPersonnelCostEuro(logs: WorkLogWithHourlyWage[], now: Date = new Date()): number {
  if (!logs.length) return 0;

  let totalCents = 0;
  let billableMinutes = 0;

  for (const log of logs) {
    const wage = log.user.hourlyWage;
    if (typeof wage !== "number" || !Number.isFinite(wage) || wage <= 0) continue;

    const minutes = workedMinutesForCostEstimate(log, now);
    if (!Number.isFinite(minutes) || minutes <= 0) continue;

    billableMinutes += minutes;
    const hours = minutes / 60;
    const cents = Math.round(hours * wage * 100);
    if (!Number.isFinite(cents) || cents <= 0) continue;
    totalCents += cents;
  }

  if (billableMinutes <= 0 || !Number.isFinite(totalCents) || totalCents <= 0) return 0;
  const euros = totalCents / 100;
  return Number.isFinite(euros) ? euros : 0;
}

export function minutesToDecimalHours(minutes: number, scale = 2): string {
  return (minutes / 60).toFixed(scale);
}

export function wageTypeForMinutes(minutes: number): { code: "001" | "002"; text: string } {
  if (minutes > 0) return { code: "001", text: "Arbeitszeit" };
  return { code: "001", text: "Arbeitszeit" };
}
