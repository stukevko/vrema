import { dateForPlannerCycleDay } from "@/lib/planning/cycle-display-date";
import { getBerlinDateKey } from "@/lib/time/timezone";

/** Montag (ISO-Datum) der Planer-Zykluswoche 1–3 — gleiche Logik wie im ShiftManager. */
export function cycleWeekStartIso(weekIndex: 1 | 2 | 3, fromDate: Date = new Date()): string {
  const monday = dateForPlannerCycleDay(weekIndex, 1, fromDate);
  return getBerlinDateKey(monday);
}
