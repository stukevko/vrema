import { workedMinutesForCostEstimate } from "@/lib/time/payroll";
import { getBerlinIsoWeekNumber, getIsoWeekBoundsUtc } from "@/lib/time/timezone";

export type WeeklySaldoResult = {
  workedMinutes: number;
  expectedMinutes: number;
  saldoMinutes: number;
  /** z. B. "KW 40" — ISO-Woche in Europe/Berlin. */
  weekLabel: string;
};

function weeklyExpectedMinutes(weeklyHours: number): number {
  const h = Number.isFinite(weeklyHours) && weeklyHours > 0 ? weeklyHours : 0;
  return Math.round(h * 60);
}

function sumWorkedInWeek(
  logs: Array<{ clockIn: Date; clockOut: Date | null; breakMins: number }>,
  reference: Date,
): number {
  return Math.round(
    logs.reduce((sum, log) => sum + workedMinutesForCostEstimate(log, reference), 0),
  );
}

/** Soll/Ist für eine Kalenderwoche — reine Berechnung ohne DB. */
export function computeWeeklySaldo(input: {
  weeklyHours: number;
  logs: Array<{ clockIn: Date; clockOut: Date | null; breakMins: number }>;
  reference?: Date;
}): WeeklySaldoResult {
  const reference = input.reference ?? new Date();
  const { start, endExclusive } = getIsoWeekBoundsUtc(reference);
  const weekLogs = input.logs.filter((log) => {
    const t = log.clockIn.getTime();
    return t >= start.getTime() && t < endExclusive.getTime();
  });
  const expectedMinutes = weeklyExpectedMinutes(input.weeklyHours);
  const workedMinutes = sumWorkedInWeek(weekLogs, reference);
  return {
    workedMinutes,
    expectedMinutes,
    saldoMinutes: workedMinutes - expectedMinutes,
    weekLabel: `KW ${getBerlinIsoWeekNumber(reference)}`,
  };
}
