import { describe, expect, it } from "vitest";
import {
  buildShiftsByUserIsoForMonth,
  monthDaysInAnchor,
} from "@/lib/planning/shift-plan-pdf";

describe("monthDaysInAnchor", () => {
  it("liefert alle Tage des Monats", () => {
    const days = monthDaysInAnchor(new Date(2026, 5, 15));
    expect(days).toHaveLength(30);
    expect(days[0]!.getDate()).toBe(1);
    expect(days[29]!.getDate()).toBe(30);
  });
});

describe("buildShiftsByUserIsoForMonth", () => {
  it("ordnet Schichten dem Kalendertag zu", () => {
    const monthDays = monthDaysInAnchor(new Date(2026, 5, 1));
    const map = buildShiftsByUserIsoForMonth(monthDays, 2, [
      {
        userId: "u1",
        weekIndex: 1,
        dayOfWeek: 1,
        startTime: "08:00",
        endTime: "16:00",
        breakDuration: 30,
      },
    ]);
    const mondayJune2026 = monthDays.find((d) => d.getDay() === 1 && d.getDate() === 1);
    expect(mondayJune2026).toBeDefined();
    const iso = "2026-06-01";
    expect(map.get(`u1-${iso}`)?.[0]?.startTime).toBe("08:00");
  });
});
