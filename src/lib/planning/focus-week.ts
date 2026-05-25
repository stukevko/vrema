import type { ShiftCycleWeeks } from "@/lib/shift-cycle";
import { normalizeCycleWeeks } from "@/lib/shift-cycle";

/** Schichtzyklus-Woche aus URL-Param `focusWeek` parsen. */
export function parsePlannerWeekIndex(
  raw: string | undefined | null,
  shiftCycleWeeks: number | null | undefined = 1,
): ShiftCycleWeeks | null {
  const max = normalizeCycleWeeks(shiftCycleWeeks);
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > max) return null;
  return n as ShiftCycleWeeks;
}
