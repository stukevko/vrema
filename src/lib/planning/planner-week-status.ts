import type { ShiftTemplateRow } from "@/lib/actions/shift-templates";
import {
  buildShiftSlotsByDay,
  type BoardMember,
  type BoardShiftRow,
} from "@/lib/planning/shift-board-model";
import { buildComplianceFlagsByShiftId, type ShiftPlanRow } from "@/lib/planning/compliance";

const DAY_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

export function countPlannerStaffingGaps(
  shifts: BoardShiftRow[],
  weekIndex: number,
  members: BoardMember[],
  templates: ShiftTemplateRow[],
  neededStaff: number,
): { openShiftSlots: number; missingAssignments: number } {
  const published = shifts.filter((s) => !s.isDraft && s.weekIndex === weekIndex);
  const byDay = buildShiftSlotsByDay(published, weekIndex, members, templates);
  let openShiftSlots = 0;
  let missingAssignments = 0;

  for (const slots of byDay.values()) {
    for (const slot of slots) {
      const staffed = slot.assignments.filter((a) => !a.isDraft).length;
      if (staffed < neededStaff) {
        openShiftSlots += 1;
        missingAssignments += neededStaff - staffed;
      }
    }
  }

  return { openShiftSlots, missingAssignments };
}

export type PlannerComplianceHint = {
  id: string;
  message: string;
  action: string;
};

export function buildPlannerComplianceHints(
  shifts: BoardShiftRow[],
  weekIndex: number,
  members: BoardMember[],
): PlannerComplianceHint[] {
  const published = shifts.filter((s) => !s.isDraft && s.weekIndex === weekIndex);
  if (published.length === 0) return [];

  const shiftRows: ShiftPlanRow[] = published.map((s) => ({
    id: s.id,
    userId: s.userId,
    weekIndex: s.weekIndex,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
  }));
  const flags = buildComplianceFlagsByShiftId(shiftRows, weekIndex);
  const memberById = new Map(members.map((m) => [m.id, m]));
  const hints: PlannerComplianceHint[] = [];

  for (const shift of published) {
    if (!flags.get(shift.id)?.restRisk) continue;
    const member = memberById.get(shift.userId);
    const name = (member?.name ?? member?.email ?? "Mitarbeiter").trim();
    const day = DAY_SHORT[shift.dayOfWeek] ?? "?";
    const time = `${shift.startTime.slice(0, 5)}–${shift.endTime.slice(0, 5)}`;
    hints.push({
      id: `rest-${shift.id}`,
      message: `${name}: ${day} ${time} — weniger als 11 Stunden Ruhe zur Schicht davor`,
      action: "Andere Person einplanen oder Schicht verschieben",
    });
  }

  return hints;
}

export function formatPlannerWeekStatusLine(input: {
  openShiftSlots: number;
  missingAssignments: number;
}): { primary: string; secondary: string | null } {
  const { openShiftSlots, missingAssignments } = input;

  if (openShiftSlots === 0) {
    return { primary: "Woche sieht gut aus", secondary: null };
  }

  const primary =
    openShiftSlots === 1 ? "1 offene Schicht" : `${openShiftSlots} offene Schichten`;
  const secondary =
    missingAssignments > openShiftSlots
      ? missingAssignments === 1
        ? "1 Person fehlt"
        : `${missingAssignments} Personen fehlen`
      : null;

  return { primary, secondary };
}
