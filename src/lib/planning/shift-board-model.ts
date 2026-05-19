import type { ShiftTemplateRow } from "@/lib/actions/shift-templates";
import {
  formatShiftRange,
  isSuspiciousShiftTime,
  shiftNetDurationMinutes,
  shiftSlotKind,
  shiftSlotTitle,
  type ShiftSlotKind,
} from "@/lib/planning/shift-display";

export const MON_FIRST_DOW = [1, 2, 3, 4, 5, 6, 0] as const;
export const WEEK_SHORT_MON = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

function normTime(t: string): string {
  return t.trim().slice(0, 5);
}

export function resolveSlotTitle(startTime: string, endTime: string, templates: ShiftTemplateRow[]): string {
  const s = normTime(startTime);
  const e = normTime(endTime);
  const match = templates.find((t) => normTime(t.startTime) === s && normTime(t.endTime) === e);
  return match?.name ?? shiftSlotTitle(startTime);
}

export function resolveSlotColor(
  startTime: string,
  endTime: string,
  templates: ShiftTemplateRow[],
): string | null {
  const s = normTime(startTime);
  const e = normTime(endTime);
  const match = templates.find((t) => normTime(t.startTime) === s && normTime(t.endTime) === e);
  const c = match?.color?.trim();
  if (c && /^#[0-9A-Fa-f]{6}$/.test(c)) return c;
  return null;
}

export function slotKey(dayOfWeek: number, startTime: string, endTime: string): string {
  return `${dayOfWeek}|${startTime}|${endTime}`;
}

export type BoardMember = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  weeklyHours?: number;
};

export type BoardShiftRow = {
  id: string;
  userId: string;
  weekIndex: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakDuration?: number;
  isDraft?: boolean;
};

export type BoardAssignment = {
  shiftId: string;
  userId: string;
  name: string;
  email: string;
  image?: string | null;
  isDraft?: boolean;
};

export type BoardShiftSlot = {
  key: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  title: string;
  rangeLabel: string;
  kind: ShiftSlotKind;
  suspicious: boolean;
  assignments: BoardAssignment[];
};

export function buildMemberWeekMinutes(
  shifts: BoardShiftRow[],
  weekIndex: number,
  memberIds: string[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const id of memberIds) map.set(id, 0);
  for (const s of shifts) {
    if (s.weekIndex !== weekIndex || !map.has(s.userId)) continue;
    if (isSuspiciousShiftTime(s.startTime, s.endTime)) continue;
    map.set(
      s.userId,
      (map.get(s.userId) ?? 0) + shiftNetDurationMinutes(s.startTime, s.endTime, s.breakDuration ?? 0),
    );
  }
  return map;
}

export function buildShiftSlotsByDay(
  shifts: BoardShiftRow[],
  weekIndex: number,
  members: BoardMember[],
  templates: ShiftTemplateRow[] = [],
): Map<number, BoardShiftSlot[]> {
  const memberById = new Map(members.map((m) => [m.id, m]));
  const buckets = new Map<string, BoardShiftSlot>();

  for (const s of shifts) {
    if (s.weekIndex !== weekIndex) continue;
    const key = slotKey(s.dayOfWeek, s.startTime, s.endTime);
    const member = memberById.get(s.userId);
    const assignment: BoardAssignment = {
      shiftId: s.id,
      userId: s.userId,
      name: member?.name ?? "Unbekannt",
      email: member?.email ?? "",
      image: member?.image,
      isDraft: s.isDraft,
    };
    const existing = buckets.get(key);
    if (existing) {
      existing.assignments.push(assignment);
    } else {
      buckets.set(key, {
        key,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        title: resolveSlotTitle(s.startTime, s.endTime, templates),
        rangeLabel: formatShiftRange(s.startTime, s.endTime),
        kind: shiftSlotKind(s.startTime),
        suspicious: isSuspiciousShiftTime(s.startTime, s.endTime),
        assignments: [assignment],
      });
    }
  }

  const byDay = new Map<number, BoardShiftSlot[]>();
  for (const dow of MON_FIRST_DOW) byDay.set(dow, []);
  for (const slot of buckets.values()) {
    const list = byDay.get(slot.dayOfWeek) ?? [];
    list.push(slot);
    byDay.set(slot.dayOfWeek, list);
  }
  for (const [, list] of byDay) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
  return byDay;
}

