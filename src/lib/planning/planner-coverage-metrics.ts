import type { ShiftPlanRow } from "@/lib/planning/compliance";
import { dayOrderMonFirst } from "@/lib/planning/cycle-display-date";

const TIMELINE_START_HOUR = 0;
const TIMELINE_END_HOUR = 24;

function toMinutes(value: string): number | null {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

type RowLike = {
  shift: ShiftPlanRow | null | undefined;
  previousShift: ShiftPlanRow | null | undefined;
  conflict: "VACATION" | "SICK" | undefined;
};

/** Eine Zeile Timeline: gleiche Logik wie ShiftManager.timelineCoverage. */
export function countCoverageGapSlotsForDay(
  _timelineDay: number,
  rows: RowLike[],
  neededStaff: number,
  coverageSlotMinutes: number,
): number {
  let gaps = 0;
  for (
    let slotStart = TIMELINE_START_HOUR * 60;
    slotStart < TIMELINE_END_HOUR * 60;
    slotStart += coverageSlotMinutes
  ) {
    const slotEnd = Math.min(slotStart + coverageSlotMinutes, TIMELINE_END_HOUR * 60);
    let assigned = 0;
    for (const row of rows) {
      if (row.conflict) continue;
      const segments: Array<{ start: number; end: number }> = [];
      if (row.previousShift) {
        const prevStart = toMinutes(row.previousShift.startTime);
        const prevEnd = toMinutes(row.previousShift.endTime);
        if (prevStart !== null && prevEnd !== null && prevEnd < prevStart) {
          segments.push({ start: 0, end: prevEnd });
        }
      }
      if (row.shift) {
        const start = toMinutes(row.shift.startTime);
        const end = toMinutes(row.shift.endTime);
        if (start !== null && end !== null) {
          if (end > start) segments.push({ start, end });
          if (end < start) segments.push({ start, end: 24 * 60 });
        }
      }
      if (segments.some((segment) => segment.start < slotEnd && segment.end > slotStart)) assigned += 1;
    }
    if (assigned < neededStaff) gaps += 1;
  }
  return gaps;
}

export function buildTimelineRowsForDay(params: {
  timelineDay: number;
  members: Array<{ id: string }>;
  shiftByKey: Map<string, ShiftPlanRow>;
  selectedWeekIndex: number;
  conflictTypeByCell: Map<string, "VACATION" | "SICK">;
}): RowLike[] {
  const { timelineDay, members, shiftByKey, selectedWeekIndex, conflictTypeByCell } = params;
  const previousDay = (timelineDay + 6) % 7;
  return members.map((m) => {
    const shift = shiftByKey.get(`${m.id}-${selectedWeekIndex}-${timelineDay}`) ?? null;
    const previousShift = shiftByKey.get(`${m.id}-${selectedWeekIndex}-${previousDay}`) ?? null;
    const conflict = conflictTypeByCell.get(`${m.id}-${timelineDay}`);
    return { shift, previousShift, conflict };
  });
}

/** Summe aller Lücken unter Sollbesetzung über Mo–So (Zeitfenster-Zählung). */
export function countWeekCoverageGapSlots(params: {
  members: Array<{ id: string }>;
  shifts: ShiftPlanRow[];
  selectedWeekIndex: number;
  conflictEntries: Array<{ userId: string; dayOfWeek: number; type?: "VACATION" | "SICK" }>;
  neededStaff: number;
  coverageSlotMinutes: number;
}): number {
  const { members, shifts, selectedWeekIndex, conflictEntries, neededStaff, coverageSlotMinutes } = params;
  const shiftByKey = new Map<string, ShiftPlanRow>();
  for (const s of shifts) {
    if (s.weekIndex !== selectedWeekIndex) continue;
    const key = `${s.userId}-${selectedWeekIndex}-${s.dayOfWeek}`;
    if (!shiftByKey.has(key)) shiftByKey.set(key, s);
  }
  const conflictTypeByCell = new Map<string, "VACATION" | "SICK">();
  for (const entry of conflictEntries) {
    conflictTypeByCell.set(`${entry.userId}-${entry.dayOfWeek}`, entry.type ?? "VACATION");
  }
  let total = 0;
  for (let d = 0; d < 7; d++) {
    const rows = buildTimelineRowsForDay({
      timelineDay: d,
      members,
      shiftByKey,
      selectedWeekIndex,
      conflictTypeByCell,
    });
    total += countCoverageGapSlotsForDay(d, rows, neededStaff, coverageSlotMinutes);
  }
  return total;
}
