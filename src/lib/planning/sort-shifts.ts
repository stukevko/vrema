import { dateForPlannerCycleDay } from "@/lib/planning/cycle-display-date";

export type PlannerShiftSortable = {
  weekIndex: number;
  dayOfWeek: number;
  startTime: string;
};

/** Kalenderzeit für Sortierung (Zyklus-Woche + Wochentag). */
export function plannerShiftTimestamp(
  shift: PlannerShiftSortable,
  anchor: Date = new Date(),
): number {
  const wk = Math.min(3, Math.max(1, Math.floor(shift.weekIndex))) as 1 | 2 | 3;
  return dateForPlannerCycleDay(wk, shift.dayOfWeek, anchor).getTime();
}

export function comparePlannerShifts(
  a: PlannerShiftSortable,
  b: PlannerShiftSortable,
  anchor: Date = new Date(),
): number {
  const diff = plannerShiftTimestamp(a, anchor) - plannerShiftTimestamp(b, anchor);
  if (diff !== 0) return diff;
  return String(a.startTime).localeCompare(String(b.startTime), "de");
}

export function sortPlannerShiftsChronologically<T extends PlannerShiftSortable>(
  shifts: T[],
  anchor: Date = new Date(),
): T[] {
  return [...shifts].sort((a, b) => comparePlannerShifts(a, b, anchor));
}
