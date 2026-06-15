import type { ShiftCycleWeeks } from "@/lib/shift-cycle";

/** Mo=0 … So=6 → Offset ab Montag dieser Kalenderwoche (0 = Mo). */
export function dayOrderMonFirst(dayOfWeek: number): number {
  return (dayOfWeek + 6) % 7;
}

/** Montag 12:00 der Kalenderwoche, die `date` enthält. */
export function mondayOfWeekContaining(date: Date): Date {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - dayOrderMonFirst(d.getDay()));
  return d;
}

export function isoFromPlannerDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Kalenderdatum für einen Plan-Tag innerhalb der sichtbaren Zyklus-Woche (Woche 1–4).
 * Entspricht der Logik im ShiftManager (`dateForCycleDay`).
 */
export function dateForPlannerCycleDay(weekIndex: ShiftCycleWeeks, dayOfWeek: number, fromDate: Date = new Date()): Date {
  const monday = mondayOfWeekContaining(fromDate);
  const d = new Date(monday);
  d.setDate(monday.getDate() + (weekIndex - 1) * 7 + dayOrderMonFirst(dayOfWeek));
  return d;
}

/** Welche Zyklus-Woche (1–Zyklus) enthält dieses Datum — null wenn außerhalb. */
export function weekIndexForPlannerDate(
  date: Date,
  cycleWeeks: ShiftCycleWeeks,
  anchor: Date = new Date(),
): ShiftCycleWeeks | null {
  const cycleStart = mondayOfWeekContaining(anchor).getTime();
  const targetMonday = mondayOfWeekContaining(date).getTime();
  const diffDays = Math.round((targetMonday - cycleStart) / 86_400_000);
  const weekOffset = Math.floor(diffDays / 7);
  if (weekOffset < 0 || weekOffset >= cycleWeeks) return null;
  return (weekOffset + 1) as ShiftCycleWeeks;
}

export function plannerCycleDateBounds(cycleWeeks: ShiftCycleWeeks, anchor: Date = new Date()) {
  const startMonday = mondayOfWeekContaining(anchor);
  const endSunday = new Date(startMonday);
  endSunday.setDate(startMonday.getDate() + cycleWeeks * 7 - 1);
  return { startMonday, endSunday };
}

/** Kompakt: „23.06–29.06“ */
export function shortWeekRangeLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit" };
  return `${monday.toLocaleDateString("de-DE", opts)}–${sunday.toLocaleDateString("de-DE", opts)}`;
}

/** Kalenderwochen (Montage), die einen Monat abdecken — typisch 4–5 Wochen. */
export function calendarWeeksForMonth(anchor: Date): Date[] {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  let monday = mondayOfWeekContaining(new Date(y, m, 1, 12, 0, 0, 0));
  const weeks: Date[] = [];
  for (let i = 0; i < 6; i++) {
    weeks.push(new Date(monday));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    monday = new Date(monday);
    monday.setDate(monday.getDate() + 7);
    if (sunday.getMonth() > m && weeks.length >= 4) break;
    if (weeks.length >= 5 && sunday.getMonth() !== m) break;
  }
  return weeks;
}

export function monthYearLabel(anchor: Date): string {
  return anchor.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

/** ISO-Daten Mo–So für eine Kalenderwoche ab Montag. */
export function isoWeekDatesFromMonday(monday: Date): string[] {
  return [1, 2, 3, 4, 5, 6, 0].map((dow) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + dayOrderMonFirst(dow));
    return isoFromPlannerDate(d);
  });
}

export function calendarDateForWeekDay(monday: Date, dayOfWeek: number): Date {
  const d = new Date(monday);
  d.setDate(monday.getDate() + dayOrderMonFirst(dayOfWeek));
  return d;
}

/** z. B. „18.05. – 24.05.2026“ */
export function formatPlannerWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit" };
  const start = monday.toLocaleDateString("de-DE", opts);
  const end = sunday.toLocaleDateString("de-DE", {
    ...opts,
    year: monday.getFullYear() === sunday.getFullYear() ? undefined : "numeric",
  });
  const yearSuffix =
    monday.getFullYear() === sunday.getFullYear() ? ` ${monday.getFullYear()}` : "";
  return `${start} – ${end}${yearSuffix}`;
}
