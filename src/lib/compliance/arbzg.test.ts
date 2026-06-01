import { describe, expect, it } from "vitest";
import {
  DEFAULT_ARBZG_CONFIG,
  complianceScore,
  evaluateShifts,
  shortLabelForRule,
  type ShiftLike,
} from "@/lib/compliance/arbzg";

const shift = (over: Partial<ShiftLike> & Pick<ShiftLike, "id">): ShiftLike => ({
  userId: "u1",
  date: "2026-06-01",
  startTime: "09:00",
  endTime: "17:00",
  breakMinutes: 30,
  ...over,
});

describe("evaluateShifts – Grundfälle", () => {
  it("leere Liste = keine Findings", () => {
    expect(evaluateShifts([])).toEqual([]);
  });

  it("konforme 8h-Schicht mit 30 Min Pause = keine Findings", () => {
    const findings = evaluateShifts([shift({ id: "s1" })]);
    expect(findings).toEqual([]);
  });
});

describe("§3 Tägliche Höchstarbeitszeit (max 10h)", () => {
  it("11h-Schicht löst Violation aus", () => {
    const findings = evaluateShifts([
      shift({ id: "s1", startTime: "08:00", endTime: "19:30", breakMinutes: 45 }), // 11h netto + 45 break? 11.5h-0.75=10.75
    ]);
    const daily = findings.find((f) => f.ruleId === "max_daily_hours");
    expect(daily).toBeDefined();
    expect(daily?.severity).toBe("violation");
  });

  it("mehrere Schichten am selben Tag summieren sich", () => {
    const findings = evaluateShifts([
      shift({ id: "s1", startTime: "06:00", endTime: "12:00", breakMinutes: 0 }), // 6h
      shift({ id: "s2", startTime: "13:00", endTime: "18:30", breakMinutes: 0 }), // 5,5h → 11,5h
    ]);
    expect(findings.some((f) => f.ruleId === "max_daily_hours")).toBe(true);
  });
});

describe("§4 Pausen", () => {
  it(">9h ohne 45 Min Pause = Violation", () => {
    const findings = evaluateShifts([
      shift({ id: "s1", startTime: "08:00", endTime: "18:30", breakMinutes: 30 }), // 10h, nur 30 Min
    ]);
    const br = findings.find((f) => f.ruleId === "min_break");
    expect(br?.severity).toBe("violation");
  });

  it(">6h ohne 30 Min Pause = Warnung", () => {
    const findings = evaluateShifts([
      shift({ id: "s1", startTime: "09:00", endTime: "16:00", breakMinutes: 0 }), // 7h, keine Pause
    ]);
    const br = findings.find((f) => f.ruleId === "min_break");
    expect(br?.severity).toBe("warn");
  });

  it("≤6h braucht keine Pause", () => {
    const findings = evaluateShifts([
      shift({ id: "s1", startTime: "09:00", endTime: "14:00", breakMinutes: 0 }), // 5h
    ]);
    expect(findings.some((f) => f.ruleId === "min_break")).toBe(false);
  });
});

describe("§5 Ruhezeit zwischen Schichten (min 11h)", () => {
  it("zu kurze Ruhezeit löst Violation aus", () => {
    const findings = evaluateShifts([
      shift({ id: "s1", date: "2026-06-01", startTime: "08:00", endTime: "18:00", breakMinutes: 30 }),
      shift({ id: "s2", date: "2026-06-02", startTime: "04:00", endTime: "10:00", breakMinutes: 0 }),
      // 18:00 → 04:00 = 10h Ruhe < 11h
    ]);
    expect(findings.some((f) => f.ruleId === "min_rest_between_shifts")).toBe(true);
  });

  it("ausreichende Ruhezeit (≥11h) = kein Finding", () => {
    const findings = evaluateShifts([
      shift({ id: "s1", date: "2026-06-01", startTime: "08:00", endTime: "16:00", breakMinutes: 30 }),
      shift({ id: "s2", date: "2026-06-02", startTime: "08:00", endTime: "16:00", breakMinutes: 30 }),
    ]);
    expect(findings.some((f) => f.ruleId === "min_rest_between_shifts")).toBe(false);
  });
});

describe("complianceScore", () => {
  it("keine Findings = Score 100", () => {
    const { score, violations, warnings } = complianceScore([], 10);
    expect(score).toBe(100);
    expect(violations).toBe(0);
    expect(warnings).toBe(0);
  });

  it("Verstöße senken den Score, bleiben aber im 0–100-Bereich", () => {
    const findings = evaluateShifts([
      shift({ id: "s1", startTime: "06:00", endTime: "20:00", breakMinutes: 0 }), // viele Verstöße
    ]);
    const { score, violations } = complianceScore(findings, 1);
    expect(violations).toBeGreaterThan(0);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(100);
  });

  it("viele saubere Schichten federn wenige Verstöße ab (Normalisierung pro Schicht)", () => {
    const findings = evaluateShifts([
      shift({ id: "bad", startTime: "06:00", endTime: "20:00", breakMinutes: 0 }),
    ]);
    const small = complianceScore(findings, 5).score;
    const large = complianceScore(findings, 100).score;
    expect(large).toBeGreaterThan(small);
  });
});

describe("shortLabelForRule / Config", () => {
  it("liefert deutsche Kurzlabels", () => {
    expect(shortLabelForRule("max_daily_hours")).toBe("Tagesgrenze");
    expect(shortLabelForRule("max_weekly_hours")).toBe("Wochengrenze");
    expect(shortLabelForRule("min_break")).toBe("Pause");
    expect(shortLabelForRule("min_rest_between_shifts")).toBe("Ruhezeit");
  });

  it("Default-Config entspricht ArbZG-Standardwerten", () => {
    expect(DEFAULT_ARBZG_CONFIG.maxDailyHours).toBe(10);
    expect(DEFAULT_ARBZG_CONFIG.maxWeeklyHours).toBe(48);
    expect(DEFAULT_ARBZG_CONFIG.minRestBetweenShiftsHours).toBe(11);
  });
});
