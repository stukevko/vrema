import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import type { ShiftPlanRow } from "@/lib/planning/compliance";
import { userHasRestRiskInWeek } from "@/lib/planning/compliance";
import { getBerlinDayBoundsUtc } from "@/lib/time/timezone";
import { clampWeekIndex, normalizeCycleWeeks } from "@/lib/shift-cycle";
import { ShiftTradeStatus, type Prisma, type UserRole } from "@prisma/client";

const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_WEEK = MINUTES_PER_DAY * 7;

export type AutopilotSlotTemplate = {
  startTime: string;
  endTime: string;
  breakDuration?: number;
  /** z. B. „Bar“ – nur MA mit passendem user.staffingRole (oder Manager als Springer) */
  staffingRole?: string | null;
};

export type AutopilotOptions = {
  slotTemplates?: AutopilotSlotTemplate[];
  /** Wie viele parallele Schichten pro Tag (rotiert durch slotTemplates) */
  coveragePerDay?: number;
  /** Anker für Kalender-Zuordnung (default: heute) */
  anchorDate?: Date;
};

export type UnfilledSlot = {
  dayOfWeek: number;
  dayLabel: string;
  startTime: string;
  endTime: string;
  staffingRole: string | null;
  reason: string;
};

export type AutopilotPlanResult = {
  shifts: Prisma.ShiftCreateManyInput[];
  unfilled: UnfilledSlot[];
  /** Aktive Mitarbeiter/Manager im Planungspool (ohne Inhaber). */
  teamPoolSize: number;
};

const DAY_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function dayOrderMonFirst(dayOfWeek: number): number {
  return (dayOfWeek + 6) % 7;
}

export function dateForCycleDay(weekIndex: number, dayOfWeek: number, anchor: Date): Date {
  const monday = new Date(anchor);
  const mondayOffset = dayOrderMonFirst(anchor.getDay());
  monday.setDate(anchor.getDate() - mondayOffset);
  monday.setHours(12, 0, 0, 0);
  const d = new Date(monday);
  d.setDate(monday.getDate() + (weekIndex - 1) * 7 + dayOrderMonFirst(dayOfWeek));
  return d;
}

function cycleWeekTimeBounds(weekIndex: number, anchor: Date) {
  let minT = dateForCycleDay(weekIndex, 1, anchor).getTime();
  let maxT = minT;
  for (let dow = 0; dow < 7; dow += 1) {
    const t = dateForCycleDay(weekIndex, dow, anchor).getTime();
    minT = Math.min(minT, t);
    maxT = Math.max(maxT, t);
  }
  const start = getBerlinDayBoundsUtc(new Date(minT)).start;
  const end = getBerlinDayBoundsUtc(new Date(maxT)).end;
  return { start, end };
}

function parseTimeToMinutes(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function shiftToInterval(dayOfWeek: number, startTime: string, endTime: string) {
  const startMinute = parseTimeToMinutes(startTime);
  const endMinute = parseTimeToMinutes(endTime);
  if (startMinute === null || endMinute === null) return null;
  if (startMinute === endMinute) return null;
  const absoluteStart = dayOfWeek * MINUTES_PER_DAY + startMinute;
  const absoluteEnd =
    dayOfWeek * MINUTES_PER_DAY + (endMinute <= startMinute ? endMinute + MINUTES_PER_DAY : endMinute);
  return { start: absoluteStart, end: absoluteEnd };
}

function intervalsOverlap(a: { start: number; end: number }, b: { start: number; end: number }) {
  return a.start < b.end && b.start < a.end;
}

function shiftDurationMinutes(start: string, end: string): number {
  const sm = parseTimeToMinutes(start);
  const em = parseTimeToMinutes(end);
  if (sm === null || em === null || sm === em) return 0;
  return em > sm ? em - sm : 24 * 60 - sm + em;
}

function shiftNetMinutes(start: string, end: string, breakMins: number) {
  return Math.max(0, shiftDurationMinutes(start, end) - Math.max(0, breakMins));
}

function hasOverlapForUser(plan: ShiftPlanRow[], weekIndex: number, userId: string): boolean {
  const rows = plan.filter((s) => s.userId === userId && s.weekIndex === weekIndex);
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const ivA = shiftToInterval(rows[i]!.dayOfWeek, rows[i]!.startTime, rows[i]!.endTime);
      const ivB = shiftToInterval(rows[j]!.dayOfWeek, rows[j]!.startTime, rows[j]!.endTime);
      if (!ivA || !ivB) continue;
      const variantsA = [
        ivA,
        { start: ivA.start + MINUTES_PER_WEEK, end: ivA.end + MINUTES_PER_WEEK },
        { start: ivA.start - MINUTES_PER_WEEK, end: ivA.end - MINUTES_PER_WEEK },
      ];
      const variantsB = [
        ivB,
        { start: ivB.start + MINUTES_PER_WEEK, end: ivB.end + MINUTES_PER_WEEK },
        { start: ivB.start - MINUTES_PER_WEEK, end: ivB.end - MINUTES_PER_WEEK },
      ];
      for (const a of variantsA) {
        for (const b of variantsB) {
          if (intervalsOverlap(a, b)) return true;
        }
      }
    }
  }
  return false;
}

/** Vor dem Freigeben von Entwürfen: Ruhezeit & Überschneidung prüfen. */
export function assertDraftsPublishable(published: ShiftPlanRow[], drafts: ShiftPlanRow[], weekIndex: number) {
  const merged = [...published, ...drafts];
  const userIds = new Set(merged.filter((s) => s.weekIndex === weekIndex).map((s) => s.userId));
  for (const uid of userIds) {
    if (hasOverlapForUser(merged, weekIndex, uid)) {
      throw new Error("Schichtüberschneidung im Entwurf – bitte anpassen oder Entwurf verwerfen.");
    }
    if (userHasRestRiskInWeek(merged, weekIndex, uid)) {
      throw new Error("Ruhezeit unter 11h im Entwurf – bitte anpassen oder Entwurf verwerfen.");
    }
  }
}

function userOverlapsShifts(
  userId: string,
  weekIndex: number,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  plan: ShiftPlanRow[]
): boolean {
  const candidate = shiftToInterval(dayOfWeek, startTime, endTime);
  if (!candidate) return true;
  const existing = plan.filter((s) => s.userId === userId && s.weekIndex === weekIndex);
  for (const row of existing) {
    const interval = shiftToInterval(row.dayOfWeek, row.startTime, row.endTime);
    if (!interval) continue;
    const variants = [
      interval,
      { start: interval.start + MINUTES_PER_WEEK, end: interval.end + MINUTES_PER_WEEK },
      { start: interval.start - MINUTES_PER_WEEK, end: interval.end - MINUTES_PER_WEEK },
    ];
    if (variants.some((v) => intervalsOverlap(candidate, v))) return true;
  }
  return false;
}

function matchesStaffingRole(role: UserRole, userStaffing: string | null, required: string | null): boolean {
  if (!required || !required.trim()) return true;
  const r = required.trim().toLowerCase();
  if (role === "MANAGER") return true;
  return (userStaffing ?? "").trim().toLowerCase() === r;
}

function userAbsentOnDay(
  userId: string,
  dayDate: Date,
  absences: Array<{ userId: string; start: Date; end: Date }>
): boolean {
  const bounds = getBerlinDayBoundsUtc(dayDate);
  for (const a of absences) {
    if (a.userId !== userId) continue;
    if (a.start <= bounds.end && a.end >= bounds.start) return true;
  }
  return false;
}

type UserLite = {
  id: string;
  role: UserRole;
  staffingRole: string | null;
  weeklyHours: number;
  hourlyWage: number | null;
};

const POOL_ROLES: UserRole[] = ["EMPLOYEE", "MANAGER"];

export async function generateOptimalSchedule(
  companyId: string,
  weekIndex: number,
  options: AutopilotOptions = {}
): Promise<AutopilotPlanResult> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { shiftCycleWeeks: true },
  });
  const wk = clampWeekIndex(weekIndex, normalizeCycleWeeks(company?.shiftCycleWeeks));
  const anchor = options.anchorDate ?? new Date();
  const templates =
    options.slotTemplates && options.slotTemplates.length > 0
      ? options.slotTemplates
      : [
          { startTime: "09:00", endTime: "17:00", breakDuration: 30 },
          { startTime: "14:00", endTime: "22:00", breakDuration: 30 },
        ];
  const requestedCoverage = Math.max(1, Math.min(6, options.coveragePerDay ?? 2));

  for (const t of templates) {
    if (!/^\d{2}:\d{2}$/.test(t.startTime) || !/^\d{2}:\d{2}$/.test(t.endTime)) {
      throw new Error("Autopilot: Ungültige Schichtzeiten in Vorlagen (HH:MM).");
    }
  }

  const { start: rangeStart, end: rangeEnd } = cycleWeekTimeBounds(wk, anchor);

  const [users, absencesRaw, existingShifts, weekendAgg] = await Promise.all([
    db.user.findMany({
      where: tenantWhere(companyId, { isActive: true, role: { in: POOL_ROLES } }),
      select: { id: true, role: true, staffingRole: true, weeklyHours: true, hourlyWage: true },
    }),
    db.absence.findMany({
      where: {
        orgId: companyId,
        status: "APPROVED",
        start: { lte: rangeEnd },
        end: { gte: rangeStart },
      },
      select: { userId: true, start: true, end: true },
    }),
    db.shift.findMany({
      where: tenantWhere(companyId, { weekIndex: wk }),
      select: {
        id: true,
        userId: true,
        weekIndex: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        isDraft: true,
      },
    }),
    db.shift.groupBy({
      by: ["userId"],
      where: {
        companyId,
        isDraft: false,
        dayOfWeek: { in: [0, 6] },
        createdAt: { gte: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) },
      },
      _count: { _all: true },
    }),
  ]);

  const weekendCount = new Map<string, number>(weekendAgg.map((g) => [g.userId, g._count._all]));

  const poolSize = users.length;
  if (poolSize === 0) {
    return { shifts: [], unfilled: [], teamPoolSize: 0 };
  }

  /** Kleine Teams: eine Vorlage, ein Slot/Tag — sonst 14 Anfragen für 1 Person. */
  const templatesUsed = poolSize <= 2 ? templates.slice(0, 1) : templates;
  const coveragePerDay =
    poolSize <= 2 ? 1 : Math.min(requestedCoverage, 2, poolSize);

  const publishedPlanRows: ShiftPlanRow[] = existingShifts
    .filter((s) => !s.isDraft)
    .map((s) => ({
      id: s.id,
      userId: s.userId,
      weekIndex: s.weekIndex,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
    }));

  const workingPlan: ShiftPlanRow[] = [...publishedPlanRows];
  const newDrafts: Prisma.ShiftCreateManyInput[] = [];
  const unfilled: UnfilledSlot[] = [];

  type Demand = {
    dayOfWeek: number;
    template: AutopilotSlotTemplate;
    layerIndex: number;
  };

  const demands: Demand[] = [];
  for (let day = 0; day < 7; day += 1) {
    for (let layer = 0; layer < coveragePerDay; layer += 1) {
      const template = templatesUsed[layer % templatesUsed.length]!;
      const already = existingShifts.filter(
        (s) =>
          !s.isDraft &&
          s.weekIndex === wk &&
          s.dayOfWeek === day &&
          s.startTime === template.startTime &&
          s.endTime === template.endTime
      ).length;
      if (already >= 1) continue;
      demands.push({ dayOfWeek: day, template, layerIndex: layer });
    }
  }

  const demandOrder = [...demands].sort((a, b) => {
    const aWe = a.dayOfWeek === 0 || a.dayOfWeek === 6 ? 1 : 0;
    const bWe = b.dayOfWeek === 0 || b.dayOfWeek === 6 ? 1 : 0;
    if (aWe !== bWe) return aWe - bWe;
    return a.dayOfWeek - b.dayOfWeek;
  });

  for (const d of demandOrder) {
    const dayDate = dateForCycleDay(wk, d.dayOfWeek, anchor);
    const slotRole = d.template.staffingRole ?? null;
    const br = d.template.breakDuration ?? 30;

    const candidates = users.filter((u) => {
      if (!matchesStaffingRole(u.role, u.staffingRole, slotRole)) return false;
      if (userAbsentOnDay(u.id, dayDate, absencesRaw)) return false;
      return true;
    });

    const scored = candidates
      .map((u) => {
        const planForScoring = [...workingPlan];
        const tempRow: ShiftPlanRow = {
          id: `tmp-${u.id}-${d.dayOfWeek}-${d.template.startTime}`,
          userId: u.id,
          weekIndex: wk,
          dayOfWeek: d.dayOfWeek,
          startTime: d.template.startTime,
          endTime: d.template.endTime,
        };
        planForScoring.push(tempRow);

        if (userOverlapsShifts(u.id, wk, d.dayOfWeek, d.template.startTime, d.template.endTime, workingPlan)) {
          return { u, score: Number.POSITIVE_INFINITY };
        }
        if (userHasRestRiskInWeek(planForScoring, wk, u.id)) {
          return { u, score: Number.POSITIVE_INFINITY };
        }

        const targetMin = u.weeklyHours * 60;
        let committed = publishedPlanRows
          .filter((s) => s.userId === u.id)
          .reduce((sum, s) => sum + shiftNetMinutes(s.startTime, s.endTime, 0), 0);
        committed += newDrafts
          .filter((s) => s.userId === u.id)
          .reduce(
            (sum, s) => sum + shiftNetMinutes(String(s.startTime), String(s.endTime), Number(s.breakDuration ?? 0)),
            0
          );
        const addMin = shiftNetMinutes(d.template.startTime, d.template.endTime, br);
        const after = committed + addMin;
        const deficit = Math.max(0, targetMin - after);
        const overtime = Math.max(0, after - targetMin * 1.05);
        const we = d.dayOfWeek === 0 || d.dayOfWeek === 6 ? (weekendCount.get(u.id) ?? 0) : 0;
        const wage = u.hourlyWage ?? 18;

        const score =
          we * 120 +
          overtime * 3 -
          deficit * 0.8 +
          wage * 0.15 +
          (d.dayOfWeek === 0 || d.dayOfWeek === 6 ? 5 : 0);

        return { u, score };
      })
      .filter((x) => Number.isFinite(x.score))
      .sort((a, b) => a.score - b.score);

    const best = scored[0];
    if (!best) {
      const roleHint = slotRole ? `Rolle „${slotRole}“` : "passende Besetzung";
      unfilled.push({
        dayOfWeek: d.dayOfWeek,
        dayLabel: DAY_DE[d.dayOfWeek] ?? String(d.dayOfWeek),
        startTime: d.template.startTime,
        endTime: d.template.endTime,
        staffingRole: slotRole,
        reason: `Kein passender Mitarbeitender (${roleHint}, Abwesenheit, Ruhezeit oder Überschneidung).`,
      });
      continue;
    }

    const rowId = `draft-${newDrafts.length}-${best.u.id}`;
    workingPlan.push({
      id: rowId,
      userId: best.u.id,
      weekIndex: wk,
      dayOfWeek: d.dayOfWeek,
      startTime: d.template.startTime,
      endTime: d.template.endTime,
    });

    newDrafts.push({
      companyId,
      userId: best.u.id,
      weekIndex: wk,
      dayOfWeek: d.dayOfWeek,
      startTime: d.template.startTime,
      endTime: d.template.endTime,
      breakDuration: br,
      isDraft: true,
      staffingRole: slotRole,
      isOpenForTrade: false,
      tradeStatus: ShiftTradeStatus.NONE,
      tradeRequestedBy: null,
    });
  }

  return { shifts: newDrafts, unfilled, teamPoolSize: poolSize };
}
