import { describe, expect, it } from "vitest";
import {
  MAX_SHIFT_CYCLE_WEEKS,
  clampWeekIndex,
  getWeekCycleIndex,
  normalizeCycleWeeks,
} from "@/lib/shift-cycle";

describe("normalizeCycleWeeks", () => {
  it("akzeptiert die gültigen Werte 1–4", () => {
    expect(normalizeCycleWeeks(1)).toBe(1);
    expect(normalizeCycleWeeks(2)).toBe(2);
    expect(normalizeCycleWeeks(3)).toBe(3);
    expect(normalizeCycleWeeks(4)).toBe(4);
  });

  it("fällt bei ungültigen/Out-of-Range-Werten auf 1 zurück", () => {
    expect(normalizeCycleWeeks(0)).toBe(1);
    expect(normalizeCycleWeeks(5)).toBe(1);
    expect(normalizeCycleWeeks(-3)).toBe(1);
    expect(normalizeCycleWeeks(null)).toBe(1);
    expect(normalizeCycleWeeks(undefined)).toBe(1);
    expect(normalizeCycleWeeks(Number.NaN)).toBe(1);
  });

  it("schneidet Nachkommastellen ab", () => {
    expect(normalizeCycleWeeks(2.9)).toBe(2);
  });

  it("MAX_SHIFT_CYCLE_WEEKS ist 4", () => {
    expect(MAX_SHIFT_CYCLE_WEEKS).toBe(4);
  });
});

describe("clampWeekIndex", () => {
  it("begrenzt auf den Firmenzyklus", () => {
    expect(clampWeekIndex(3, 2)).toBe(2);
    expect(clampWeekIndex(4, 4)).toBe(4);
    expect(clampWeekIndex(99, 4)).toBe(4);
  });

  it("ist nie kleiner als 1", () => {
    expect(clampWeekIndex(0, 4)).toBe(1);
    expect(clampWeekIndex(-5, 4)).toBe(1);
    expect(clampWeekIndex(Number.NaN, 4)).toBe(1);
  });

  it("nutzt MAX als Default-Cycle und normalisiert ungültige Cycle-Angaben", () => {
    expect(clampWeekIndex(4)).toBe(4);
    // Ungültiger Cycle → normalizeCycleWeeks → 1 → alles wird auf 1 geklemmt.
    expect(clampWeekIndex(3, 0)).toBe(1);
  });
});

describe("getWeekCycleIndex", () => {
  it("liefert bei 1-Wochen-Zyklus immer 1", () => {
    expect(getWeekCycleIndex(new Date("2026-06-01"), 1)).toBe(1);
    expect(getWeekCycleIndex(new Date("2026-12-31"), 1)).toBe(1);
  });

  it("rotiert über die ISO-Woche und bleibt im gültigen Bereich", () => {
    const idx = getWeekCycleIndex(new Date("2026-06-01"), 4);
    expect(idx).toBeGreaterThanOrEqual(1);
    expect(idx).toBeLessThanOrEqual(4);
  });

  it("aufeinanderfolgende Wochen erhöhen den Index zyklisch", () => {
    const w1 = getWeekCycleIndex(new Date("2026-01-05"), 2); // ISO-Woche X
    const w2 = getWeekCycleIndex(new Date("2026-01-12"), 2); // X+1
    expect(w1).not.toBe(w2);
    expect([1, 2]).toContain(w1);
    expect([1, 2]).toContain(w2);
  });
});
