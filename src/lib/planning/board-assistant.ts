import type { PlannerStaffingHint } from "@/lib/actions/predictive";
import {
  buildComplianceFlagsByShiftId,
  userHasRestRiskInWeek,
  type PlanComplianceFlags,
  type ShiftPlanRow,
} from "@/lib/planning/compliance";
import { MON_FIRST_DOW } from "@/lib/planning/shift-board-model";
import type { StaffingDayRecommendation } from "@/lib/predictive/compute-staffing-week";

/** Ab dieser Überstunden-Schwelle (Stunden) wird der Assistent aktiv. */
export const CRITICAL_OVERTIME_HOURS = 20;

export const CRITICAL_OVERTIME_MINUTES = CRITICAL_OVERTIME_HOURS * 60;

export type MemberSaldoSnapshot = {
  userId: string;
  workedMinutes: number;
  expectedMinutes: number;
  saldoMinutes: number;
  saldoHours: number;
  isCriticalOvertime: boolean;
};

export function saldoSnapshotFromRaw(
  userId: string,
  raw: { workedMinutes: number; expectedMinutes: number; saldoMinutes: number },
): MemberSaldoSnapshot {
  const saldoHours = Math.round((raw.saldoMinutes / 60) * 10) / 10;
  return {
    userId,
    workedMinutes: raw.workedMinutes,
    expectedMinutes: raw.expectedMinutes,
    saldoMinutes: raw.saldoMinutes,
    saldoHours,
    isCriticalOvertime: raw.saldoMinutes >= CRITICAL_OVERTIME_MINUTES,
  };
}

export function formatSaldoHours(saldoMinutes: number): string {
  const h = Math.abs(saldoMinutes) / 60;
  const rounded = Math.round(h * 10) / 10;
  return `${saldoMinutes >= 0 ? "+" : "−"}${rounded}h`;
}

export type AssignmentRiskLevel = "ok" | "warn" | "block";

export type AssignmentRisk = {
  level: AssignmentRiskLevel;
  reasons: string[];
  saldoHours?: number;
  plannedWeekHours?: number;
  weeklyTargetHours?: number;
  restRisk?: boolean;
};

export function evaluateMemberAssignmentRisk(input: {
  userId: string;
  dayOfWeek: number;
  weekIndex: number;
  saldo: MemberSaldoSnapshot | null;
  weeklyHours: number | null | undefined;
  plannedWeekMinutes: number;
  shifts: ShiftPlanRow[];
  proposedStartTime: string;
  proposedEndTime: string;
}): AssignmentRisk {
  const reasons: string[] = [];
  let level: AssignmentRiskLevel = "ok";

  const saldoHours = input.saldo?.saldoHours ?? 0;
  const targetH = input.weeklyHours ?? 0;
  const plannedH = input.plannedWeekMinutes / 60;

  if (input.saldo?.isCriticalOvertime) {
    reasons.push(`${Math.round(Math.abs(saldoHours))} Überstunden diese Woche`);
    level = "warn";
  } else if (input.saldo && input.saldo.saldoMinutes > 8 * 60) {
    reasons.push(`${formatSaldoHours(input.saldo.saldoMinutes)} Überstunden`);
    level = "warn";
  }

  if (targetH > 0 && plannedH >= targetH) {
    reasons.push(`Wochen-Soll (${Math.round(targetH)}h) bereits erreicht oder überschritten`);
    level = "warn";
  }

  const hypothetical: ShiftPlanRow = {
    id: "__proposed__",
    userId: input.userId,
    weekIndex: input.weekIndex,
    dayOfWeek: input.dayOfWeek,
    startTime: input.proposedStartTime,
    endTime: input.proposedEndTime,
  };
  const weekShifts = input.shifts.filter((s) => s.weekIndex === input.weekIndex);
  const withProposal = [
    ...weekShifts.filter((s) => !(s.userId === input.userId && s.dayOfWeek === input.dayOfWeek)),
    hypothetical,
  ];
  if (userHasRestRiskInWeek(withProposal, input.weekIndex, input.userId)) {
    reasons.push("Ruhezeit unter 11 Stunden zwischen Schichten");
    level = level === "warn" ? "block" : "warn";
  }

  const flags = buildComplianceFlagsByShiftId(withProposal, input.weekIndex);
  const proposedFlags = flags.get("__proposed__");
  if (proposedFlags?.pauseRisk) {
    reasons.push("Schicht über 6h — Pausenregel prüfen");
    if (level === "ok") level = "warn";
  }

  if (input.saldo?.isCriticalOvertime && targetH > 0 && plannedH >= targetH * 0.95) {
    level = "block";
  }

  return {
    level,
    reasons,
    saldoHours,
    plannedWeekHours: Math.round(plannedH * 10) / 10,
    weeklyTargetHours: targetH > 0 ? targetH : undefined,
    restRisk: proposedFlags?.restRisk ?? false,
  };
}

export type OvertimeRecoveryDay = {
  dayOfWeek: number;
  dayLabel: string;
  reason: string;
  shiftCount: number;
};

export function suggestOvertimeRecoveryDays(input: {
  weekIndex: number;
  userId: string;
  shifts: ShiftPlanRow[];
  staffingHints: PlannerStaffingHint[];
  staffingDays?: StaffingDayRecommendation[];
  maxDays?: number;
}): OvertimeRecoveryDay[] {
  const maxDays = input.maxDays ?? 2;
  const userShiftDays = new Set(
    input.shifts
      .filter((s) => s.userId === input.userId && s.weekIndex === input.weekIndex)
      .map((s) => s.dayOfWeek),
  );
  if (userShiftDays.size === 0) return [];

  const hintByDow = new Map(input.staffingHints.map((h) => [h.dayOfWeek, h]));
  const dayByDow = new Map((input.staffingDays ?? []).map((d) => [d.dayOfWeek, d]));

  const scored: Array<{ dow: number; score: number; reason: string; shiftCount: number }> = [];

  for (const dow of MON_FIRST_DOW) {
    if (!userShiftDays.has(dow)) continue;
    const hint = hintByDow.get(dow);
    const dayRec = dayByDow.get(dow);
    let score = 0;
    let reason = "Freier Tag in der Planwoche";

    if (hint?.tone === "closed") {
      score += 30;
      reason = "Prognose: ruhiger Tag / geschlossen";
    } else if (hint?.tone === "calm") {
      score += 25;
      reason = "Prognose: geringe Auslastung";
    } else if (dayRec?.peakLevel === "LOW" || dayRec?.tone === "calm") {
      score += 20;
      reason = "Stoßprofil: eher ruhig";
    } else if (hint?.tone === "watch") {
      score += 8;
      reason = "Moderate Auslastung — trotzdem möglich";
    } else {
      score += 2;
      reason = "Schichten vorhanden — Ausgleich möglich";
    }

    const shiftCount = input.shifts.filter(
      (s) => s.userId === input.userId && s.weekIndex === input.weekIndex && s.dayOfWeek === dow,
    ).length;
    scored.push({ dow, score, reason, shiftCount });
  }

  scored.sort((a, b) => b.score - a.score);
  const picked = scored.slice(0, maxDays);

  const dowLabel = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

  return picked.map((p) => ({
    dayOfWeek: p.dow,
    dayLabel: dowLabel[p.dow] ?? "Tag",
    reason: p.reason,
    shiftCount: p.shiftCount,
  }));
}

export function pickAlternativeAssignee(input: {
  slotDayOfWeek: number;
  members: Array<{ id: string; name: string | null; email: string }>;
  saldoByUserId: Map<string, MemberSaldoSnapshot>;
  excludeUserId: string;
  conflictDaysByUserId?: Record<string, number[]>;
}): { userId: string; name: string; saldoHours: number } | null {
  let best: { userId: string; name: string; saldoHours: number; score: number } | null = null;

  for (const m of input.members) {
    if (m.id === input.excludeUserId) continue;
    const conflicts = new Set(input.conflictDaysByUserId?.[m.id] ?? []);
    if (conflicts.has(input.slotDayOfWeek)) continue;
    const saldo = input.saldoByUserId.get(m.id);
    const saldoHours = saldo?.saldoHours ?? 0;
    const score = -saldoHours;
    if (!best || score > best.score) {
      best = {
        userId: m.id,
        name: m.name ?? m.email,
        saldoHours,
        score,
      };
    }
  }

  return best ? { userId: best.userId, name: best.name, saldoHours: best.saldoHours } : null;
}

export function countCriticalOvertimeMembers(saldoByUserId: Map<string, MemberSaldoSnapshot>): number {
  let n = 0;
  for (const s of saldoByUserId.values()) {
    if (s.isCriticalOvertime) n++;
  }
  return n;
}

export function complianceFlagsForWeek(
  shifts: ShiftPlanRow[],
  weekIndex: number,
): Map<string, PlanComplianceFlags> {
  return buildComplianceFlagsByShiftId(shifts, weekIndex);
}
