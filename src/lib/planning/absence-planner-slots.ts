import { getWeekCycleIndex, normalizeCycleWeeks } from "@/lib/shift-cycle";
import { berlinDateKeyToDayOfWeek, listBerlinDateKeysInclusive } from "@/lib/time/timezone";

/** Kalendertage → Planer-Slots (Zyklus-Woche + Wochentag). */
export function plannerSlotsForBerlinDateRange(
  startDate: Date,
  endDate: Date,
  shiftCycleWeeks: number | null | undefined,
): Array<{ weekIndex: number; dayOfWeek: number }> {
  const cycle = normalizeCycleWeeks(shiftCycleWeeks);
  const seen = new Set<string>();
  const slots: Array<{ weekIndex: number; dayOfWeek: number }> = [];

  for (const dateKey of listBerlinDateKeysInclusive(startDate, endDate)) {
    const noon = new Date(`${dateKey}T12:00:00`);
    const weekIndex = getWeekCycleIndex(noon, cycle);
    const dayOfWeek = berlinDateKeyToDayOfWeek(dateKey);
    const key = `${weekIndex}-${dayOfWeek}`;
    if (seen.has(key)) continue;
    seen.add(key);
    slots.push({ weekIndex, dayOfWeek });
  }

  return slots;
}
