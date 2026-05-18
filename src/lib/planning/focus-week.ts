/** Schichtzyklus-Woche (1–3) aus URL-Param `focusWeek` parsen. */
export function parsePlannerWeekIndex(
  raw: string | undefined | null,
  shiftCycleWeeks: 1 | 2 | 3 = 1,
): 1 | 2 | 3 | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > shiftCycleWeeks) return null;
  return n as 1 | 2 | 3;
}
