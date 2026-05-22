"use server";

import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import {
  complianceScore,
  evaluateShifts,
  DEFAULT_ARBZG_CONFIG,
  type ArbZgFinding,
  type ShiftLike,
} from "@/lib/compliance/arbzg";
import { listBerlinDateKeysInclusive, berlinDateKeyToDayOfWeek } from "@/lib/time/timezone";

export type WeeklyComplianceReport = {
  weekStart: string;
  weekEnd: string;
  score: number;
  violations: number;
  warnings: number;
  perRule: Record<string, number>;
  findings: Array<ArbZgFinding & { userName: string | null }>;
};

/**
 * Liefert einen kompakten ArbZG-Wochenbericht für die Firma des aktuellen Users.
 * Verwendet alle Schichten der Woche, gruppiert pro User.
 *
 *   `weekStart` als Berliner ISO-Date (Montag empfohlen), 7 Tage werden geprüft.
 */
export async function getWeeklyComplianceReport(weekStart: string): Promise<WeeklyComplianceReport> {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Compliance-Berichte sind nur für Inhaber und Manager verfügbar.");
  }

  const [sy, sm, sd] = weekStart.split("-").map(Number);
  const startDate = new Date(Date.UTC(sy, sm - 1, sd));
  const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);

  const days = listBerlinDateKeysInclusive(startDate, endDate);
  const daysOfWeek = days.map((d) => ({ day: d, dow: berlinDateKeyToDayOfWeek(d) }));

  // Wir holen Schichten der Woche – Schema hat dayOfWeek 0..6 + weekIndex.
  // Für die Compliance-Engine reicht aktuell „Schichtmuster dieser Woche".
  // Für eine perfekte Genauigkeit könnten wir später WorkLog statt Shift nutzen.
  const shifts = await db.shift.findMany({
    where: tenantWhere(companyId, {
      isDraft: false,
      dayOfWeek: { in: Array.from(new Set(daysOfWeek.map((d) => d.dow))) },
    }),
    select: {
      id: true,
      userId: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      breakDuration: true,
      user: { select: { name: true } },
    },
  });

  // Schichten auf die konkreten Wochentage mappen.
  const shiftLikes: ShiftLike[] = [];
  const userNameById = new Map<string, string | null>();
  for (const s of shifts) {
    const targetDay = daysOfWeek.find((d) => d.dow === s.dayOfWeek);
    if (!targetDay) continue;
    shiftLikes.push({
      id: s.id,
      userId: s.userId,
      date: targetDay.day,
      startTime: s.startTime,
      endTime: s.endTime,
      breakMinutes: s.breakDuration ?? 0,
    });
    userNameById.set(s.userId, s.user?.name ?? null);
  }

  const findings = evaluateShifts(shiftLikes, DEFAULT_ARBZG_CONFIG);
  const score = complianceScore(findings, shiftLikes.length);

  // User-IDs aus Findings raussuchen (über shiftIds) und Namen anreichern.
  const enrichedFindings = findings.map((f) => {
    const firstId = f.shiftIds[0];
    const shift = shiftLikes.find((s) => s.id === firstId);
    const userId = shift?.userId ?? "";
    return { ...f, userName: userNameById.get(userId) ?? null };
  });

  return {
    weekStart: days[0] ?? weekStart,
    weekEnd: days[days.length - 1] ?? weekStart,
    score: score.score,
    violations: score.violations,
    warnings: score.warnings,
    perRule: score.perRule,
    findings: enrichedFindings,
  };
}
