/** Maximaler Schichtplan-Zyklus (Kalenderwochen im Planer). */
export const MAX_SHIFT_CYCLE_WEEKS = 4;

export type ShiftCycleWeeks = 1 | 2 | 3 | 4;

export function getIsoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function normalizeCycleWeeks(value: number | null | undefined): ShiftCycleWeeks {
  const n = Math.floor(Number(value));
  if (n === 2) return 2;
  if (n === 3) return 3;
  if (n === 4) return 4;
  return 1;
}

/** Planer-Woche (1…Zyklus) sicher begrenzen. */
export function clampWeekIndex(
  weekIndex: number,
  cycleWeeks: number | null | undefined = MAX_SHIFT_CYCLE_WEEKS,
): ShiftCycleWeeks {
  const max = normalizeCycleWeeks(cycleWeeks);
  const n = Math.floor(weekIndex);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(max, n) as ShiftCycleWeeks;
}

export function getWeekCycleIndex(
  date: Date,
  cycleWeeks: number | null | undefined,
): ShiftCycleWeeks {
  const normalized = normalizeCycleWeeks(cycleWeeks);
  if (normalized === 1) return 1;
  const isoWeek = getIsoWeekNumber(date);
  const index = ((isoWeek - 1) % normalized) + 1;
  return clampWeekIndex(index, normalized);
}
