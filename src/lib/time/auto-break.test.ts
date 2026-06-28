import { describe, expect, it } from "vitest";
import {
  finalizeBreakMinutesOnClose,
  requiredBreakMinutesForGross,
  resolveEffectiveBreakMins,
} from "@/lib/time/auto-break";
import { workedMinutes } from "@/lib/time/payroll";

describe("requiredBreakMinutesForGross", () => {
  it("keine Pflichtpause bis 6h", () => {
    expect(requiredBreakMinutesForGross(6 * 60)).toBe(0);
  });

  it("30 Min ab über 6h", () => {
    expect(requiredBreakMinutesForGross(7 * 60)).toBe(30);
    expect(requiredBreakMinutesForGross(8 * 60)).toBe(30);
  });

  it("45 Min ab über 9h", () => {
    expect(requiredBreakMinutesForGross(9 * 60 + 1)).toBe(45);
    expect(requiredBreakMinutesForGross(10 * 60)).toBe(45);
  });
});

describe("resolveEffectiveBreakMins", () => {
  const eightHourShift = {
    clockIn: "2026-06-02T08:00:00+02:00",
    clockOut: "2026-06-02T16:00:00+02:00",
    breakMins: 0,
  };

  it("ergänzt fehlende Pause bei 8h-Schicht", () => {
    expect(resolveEffectiveBreakMins(eightHourShift)).toBe(30);
  });

  it("reduziert manuell erfasste Pause nicht", () => {
    expect(resolveEffectiveBreakMins({ ...eightHourShift, breakMins: 45 })).toBe(45);
  });

  it("lässt kurze Schicht unverändert", () => {
    expect(
      resolveEffectiveBreakMins({
        clockIn: "2026-06-02T08:00:00+02:00",
        clockOut: "2026-06-02T12:00:00+02:00",
        breakMins: 0,
      }),
    ).toBe(0);
  });
});

describe("workedMinutes mit Auto-Pause", () => {
  it("8h ohne Pause → 7,5h netto", () => {
    expect(
      workedMinutes({
        clockIn: "2026-06-02T08:00:00+02:00",
        clockOut: "2026-06-02T16:00:00+02:00",
        breakMins: 0,
      }),
    ).toBe(7 * 60 + 30);
  });

  it("gestempelte Pause bleibt maßgeblich wenn ausreichend", () => {
    expect(
      workedMinutes({
        clockIn: "2026-06-02T08:00:00+02:00",
        clockOut: "2026-06-02T16:00:00+02:00",
        breakMins: 60,
      }),
    ).toBe(7 * 60);
  });
});

describe("finalizeBreakMinutesOnClose", () => {
  it("setzt Hinweis bei automatischer Ergänzung", () => {
    const result = finalizeBreakMinutesOnClose({
      clockIn: new Date("2026-06-02T06:00:00.000Z"),
      clockOut: new Date("2026-06-02T14:00:00.000Z"),
      breakMins: 0,
      note: null,
    });
    expect(result.autoAddedMins).toBeGreaterThan(0);
    expect(result.note).toContain("Pause automatisch ergänzt");
  });
});
