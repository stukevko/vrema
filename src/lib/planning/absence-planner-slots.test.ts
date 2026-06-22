import { describe, expect, it } from "vitest";
import { plannerSlotsForBerlinDateRange } from "@/lib/planning/absence-planner-slots";

describe("plannerSlotsForBerlinDateRange", () => {
  it("liefert einen Slot pro Kalendertag", () => {
    const start = new Date("2026-06-09T00:00:00.000Z");
    const end = new Date("2026-06-11T23:59:59.999Z");
    const slots = plannerSlotsForBerlinDateRange(start, end, 4);
    expect(slots.length).toBeGreaterThanOrEqual(3);
  });

  it("dedupliziert identische Zyklus-Slots", () => {
    const start = new Date("2026-06-09T12:00:00.000Z");
    const end = new Date("2026-06-09T12:00:00.000Z");
    const slots = plannerSlotsForBerlinDateRange(start, end, 1);
    expect(slots).toHaveLength(1);
  });
});
