import { dateForPlannerCycleDay } from "@/lib/planning/cycle-display-date";
import { getBerlinDateKey } from "@/lib/time/timezone";

import type { ShiftCycleWeeks } from "@/lib/shift-cycle";

/** Montag (ISO-Datum) der Planer-Zykluswoche — gleiche Logik wie im ShiftManager. */
export function cycleWeekStartIso(weekIndex: ShiftCycleWeeks, fromDate: Date = new Date()): string {
  const monday = dateForPlannerCycleDay(weekIndex, 1, fromDate);
  return getBerlinDateKey(monday);
}
