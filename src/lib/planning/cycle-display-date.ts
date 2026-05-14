/** Mo=0 … So=6 → Offset ab Montag dieser Kalenderwoche (0 = Mo). */
export function dayOrderMonFirst(dayOfWeek: number): number {
  return (dayOfWeek + 6) % 7;
}

/**
 * Kalenderdatum für einen Plan-Tag innerhalb der sichtbaren Zyklus-Woche (Woche 1–3).
 * Entspricht der Logik im ShiftManager (`dateForCycleDay`).
 */
export function dateForPlannerCycleDay(weekIndex: 1 | 2 | 3, dayOfWeek: number, fromDate: Date = new Date()): Date {
  const now = new Date(fromDate);
  const monday = new Date(now);
  const mondayOffset = dayOrderMonFirst(now.getDay());
  monday.setDate(now.getDate() - mondayOffset);
  monday.setHours(12, 0, 0, 0);
  const d = new Date(monday);
  d.setDate(monday.getDate() + (weekIndex - 1) * 7 + dayOrderMonFirst(dayOfWeek));
  return d;
}
