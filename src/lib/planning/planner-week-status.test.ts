import { describe, expect, it } from "vitest";
import {
  countPlannerStaffingGaps,
  formatPlannerWeekStatusLine,
} from "@/lib/planning/planner-week-status";
import type { BoardShiftRow } from "@/lib/planning/shift-board-model";

describe("planner-week-status", () => {
  it("zählt offene Schichten nach Mindestbesetzung", () => {
    const shifts: BoardShiftRow[] = [
      {
        id: "1",
        userId: "u1",
        weekIndex: 1,
        dayOfWeek: 1,
        startTime: "08:00",
        endTime: "16:00",
      },
    ];
    const members = [{ id: "u1", name: "Kevin", email: "k@test.de" }];
    const result = countPlannerStaffingGaps(shifts, 1, members, [], 2);
    expect(result.openShiftSlots).toBe(1);
    expect(result.missingAssignments).toBe(1);
  });

  it("formatiert verständlichen Wochen-Status", () => {
    expect(formatPlannerWeekStatusLine({ openShiftSlots: 0, missingAssignments: 0 }).primary).toBe(
      "Woche sieht gut aus",
    );
    expect(formatPlannerWeekStatusLine({ openShiftSlots: 2, missingAssignments: 3 }).primary).toBe(
      "2 offene Schichten",
    );
  });
});
