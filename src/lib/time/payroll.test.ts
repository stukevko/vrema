import { describe, expect, it } from "vitest";
import {
  isValidWorkInstant,
  sumPersonnelCostEuro,
  sumWorkedMinutes,
  workedMinutes,
  workedMinutesForCostEstimate,
} from "@/lib/time/payroll";

// Hinweis: payroll rechnet intern in Europe/Berlin (Intl mit fixer TZ),
// daher sind die Tests unabhängig von der TZ der Test-Maschine.
// Wir nutzen ISO-Strings mit explizitem Berlin-Sommerzeit-Offset (+02:00).

describe("isValidWorkInstant", () => {
  it("lehnt null/undefined ab", () => {
    expect(isValidWorkInstant(null)).toBe(false);
    expect(isValidWorkInstant(undefined)).toBe(false);
  });

  it("lehnt Unix-Epoch-/1970-Müll ab", () => {
    expect(isValidWorkInstant(new Date(0))).toBe(false);
    expect(isValidWorkInstant(new Date("1970-01-01T00:00:00Z"))).toBe(false);
  });

  it("lehnt ungültige Datumswerte ab", () => {
    expect(isValidWorkInstant(new Date("not-a-date"))).toBe(false);
  });

  it("akzeptiert plausible moderne Zeitpunkte", () => {
    expect(isValidWorkInstant(new Date("2026-06-01T08:00:00+02:00"))).toBe(true);
  });
});

describe("workedMinutes", () => {
  it("offene Schicht (kein clockOut) = 0", () => {
    expect(
      workedMinutes({ clockIn: "2026-06-01T08:00:00+02:00", clockOut: null, breakMins: 0 }),
    ).toBe(0);
  });

  it("gleicher Berlin-Tag: reine Wanduhr-Differenz minus Pause", () => {
    const mins = workedMinutes({
      clockIn: "2026-06-01T08:00:00+02:00",
      clockOut: "2026-06-01T16:30:00+02:00",
      breakMins: 30,
    });
    expect(mins).toBe(8 * 60 + 30 - 30); // 8,5h brutto − 30 Min Pause = 480
  });

  it("negative/kaputte Pause wird auf 0 normalisiert", () => {
    const mins = workedMinutes({
      clockIn: "2026-06-01T08:00:00+02:00",
      clockOut: "2026-06-01T12:00:00+02:00",
      breakMins: -99,
    });
    expect(mins).toBe(4 * 60);
  });

  it("+24h-DB-Bug (Ende exakt +1 Tag, gleiche Uhrzeit-Logik) wird auf Wanduhr korrigiert", () => {
    // clockIn 08:00, clockOut nächster Tag 16:00 mit ~+24h Instanz-Differenz
    const mins = workedMinutes({
      clockIn: "2026-06-01T08:00:00+02:00",
      clockOut: "2026-06-02T16:00:00+02:00",
      breakMins: 0,
    });
    // Soll als 8h-Schicht interpretiert werden, nicht als 32h.
    expect(mins).toBe(8 * 60);
  });

  it("echte Nachtschicht (Start ≥22:00, Ende früh am Folgetag)", () => {
    const mins = workedMinutes({
      clockIn: "2026-06-01T22:00:00+02:00",
      clockOut: "2026-06-02T06:00:00+02:00",
      breakMins: 0,
    });
    expect(mins).toBe(8 * 60);
  });
});

describe("sumWorkedMinutes", () => {
  it("summiert mehrere Logs", () => {
    const total = sumWorkedMinutes([
      { clockIn: "2026-06-01T08:00:00+02:00", clockOut: "2026-06-01T12:00:00+02:00", breakMins: 0 },
      { clockIn: "2026-06-02T08:00:00+02:00", clockOut: "2026-06-02T10:00:00+02:00", breakMins: 0 },
    ]);
    expect(total).toBe(6 * 60);
  });
});

describe("workedMinutesForCostEstimate", () => {
  it("ungültiger clockIn (Epoch) → 0 (kein Phantom)", () => {
    expect(
      workedMinutesForCostEstimate({ clockIn: new Date(0), clockOut: null, breakMins: 0 }),
    ).toBe(0);
  });

  it("offene Schicht: clockIn→now, gekappt auf max. 24h", () => {
    const start = "2026-06-01T08:00:00+02:00";
    const now = new Date("2026-06-01T12:00:00+02:00");
    expect(workedMinutesForCostEstimate({ clockIn: start, clockOut: null, breakMins: 0 }, now)).toBe(
      4 * 60,
    );
  });

  it("offene Schicht mit now ≤ clockIn → 0", () => {
    const start = "2026-06-01T08:00:00+02:00";
    const now = new Date("2026-06-01T07:00:00+02:00");
    expect(workedMinutesForCostEstimate({ clockIn: start, clockOut: null, breakMins: 0 }, now)).toBe(0);
  });

  it("offene Schicht wird auf 24h gekappt (kein astronomischer Wert)", () => {
    const start = "2026-06-01T08:00:00+02:00";
    const now = new Date("2026-06-10T08:00:00+02:00"); // 9 Tage offen
    expect(
      workedMinutesForCostEstimate({ clockIn: start, clockOut: null, breakMins: 0 }, now),
    ).toBe(24 * 60);
  });

  it("ungültiges clockOut (Epoch) → 0", () => {
    expect(
      workedMinutesForCostEstimate({
        clockIn: "2026-06-01T08:00:00+02:00",
        clockOut: new Date(0),
        breakMins: 0,
      }),
    ).toBe(0);
  });

  it("clockOut ≤ clockIn → 0", () => {
    expect(
      workedMinutesForCostEstimate({
        clockIn: "2026-06-01T12:00:00+02:00",
        clockOut: "2026-06-01T08:00:00+02:00",
        breakMins: 0,
      }),
    ).toBe(0);
  });
});

describe("sumPersonnelCostEuro", () => {
  it("leere Liste = 0 €", () => {
    expect(sumPersonnelCostEuro([])).toBe(0);
  });

  it("ignoriert Mitarbeiter ohne/ungültigen Stundenlohn", () => {
    const cost = sumPersonnelCostEuro([
      {
        clockIn: "2026-06-01T08:00:00+02:00",
        clockOut: "2026-06-01T12:00:00+02:00",
        breakMins: 0,
        user: { hourlyWage: null },
      },
    ]);
    expect(cost).toBe(0);
  });

  it("berechnet Brutto-Kosten korrekt (4h × 15 €)", () => {
    const cost = sumPersonnelCostEuro([
      {
        clockIn: "2026-06-01T08:00:00+02:00",
        clockOut: "2026-06-01T12:00:00+02:00",
        breakMins: 0,
        user: { hourlyWage: 15 },
      },
    ]);
    expect(cost).toBe(60);
  });

  it("ein offenes Epoch-Log erzeugt 0 € statt Milliardenbetrag (Regression)", () => {
    const cost = sumPersonnelCostEuro([
      {
        clockIn: new Date(0),
        clockOut: null,
        breakMins: 0,
        user: { hourlyWage: 20 },
      },
    ]);
    expect(cost).toBe(0);
  });

  it("summiert mehrere gültige Mitarbeiter", () => {
    const now = new Date("2026-06-01T12:00:00+02:00");
    const cost = sumPersonnelCostEuro(
      [
        {
          clockIn: "2026-06-01T08:00:00+02:00",
          clockOut: "2026-06-01T12:00:00+02:00",
          breakMins: 0,
          user: { hourlyWage: 15 },
        },
        {
          clockIn: "2026-06-01T08:00:00+02:00",
          clockOut: null, // offen, 4h bis now
          breakMins: 0,
          user: { hourlyWage: 12 },
        },
      ],
      now,
    );
    expect(cost).toBe(60 + 48);
  });
});
