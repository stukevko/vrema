import { describe, expect, it } from "vitest";
import { computeWeeklySaldo } from "@/lib/time/saldo-weekly";
import { getBerlinIsoWeekNumber, getIsoWeekBoundsUtc } from "@/lib/time/timezone";

/** Mittwoch in KW 40/2025 (Europe/Berlin). */
const KW40_REFERENCE = new Date("2025-10-01T12:00:00Z");

function closedLog(clockInIso: string, hours: number) {
  const start = new Date(clockInIso);
  const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
  return { clockIn: start, clockOut: end, breakMins: 0 };
}

describe("computeWeeklySaldo", () => {
  it("50h Ist bei 40h Soll = +10h in derselben KW (nicht kumulierter Gesamt-Saldo)", () => {
    const { start } = getIsoWeekBoundsUtc(KW40_REFERENCE);
    const monday = start;
    const logs = [
      closedLog(new Date(monday.getTime() + 8 * 3600_000).toISOString(), 10),
      closedLog(new Date(monday.getTime() + 24 * 3600_000).toISOString(), 10),
      closedLog(new Date(monday.getTime() + 48 * 3600_000).toISOString(), 10),
      closedLog(new Date(monday.getTime() + 72 * 3600_000).toISOString(), 10),
      closedLog(new Date(monday.getTime() + 96 * 3600_000).toISOString(), 10),
    ];

    const result = computeWeeklySaldo({
      weeklyHours: 40,
      logs,
      reference: KW40_REFERENCE,
    });

    expect(result.workedMinutes).toBe(50 * 60);
    expect(result.expectedMinutes).toBe(40 * 60);
    expect(result.saldoMinutes).toBe(10 * 60);
    expect(result.weekLabel).toBe(`KW ${getBerlinIsoWeekNumber(KW40_REFERENCE)}`);
  });

  it("Logs aus einer anderen Woche zählen nicht", () => {
    const { start } = getIsoWeekBoundsUtc(KW40_REFERENCE);
    const prevWeek = new Date(start.getTime() - 7 * 24 * 3600_000);
    const logs = [closedLog(prevWeek.toISOString(), 50)];

    const result = computeWeeklySaldo({
      weeklyHours: 40,
      logs,
      reference: KW40_REFERENCE,
    });

    expect(result.workedMinutes).toBe(0);
    expect(result.saldoMinutes).toBe(-40 * 60);
  });

  it("laufende Schicht zählt bis reference mit", () => {
    const openStart = new Date("2025-10-01T06:00:00Z");
    const reference = new Date("2025-10-01T14:00:00Z");
    const result = computeWeeklySaldo({
      weeklyHours: 40,
      logs: [{ clockIn: openStart, clockOut: null, breakMins: 0 }],
      reference,
    });

    expect(result.workedMinutes).toBeGreaterThan(0);
    expect(result.workedMinutes).toBeLessThanOrEqual(8 * 60);
  });
});
