import {
  formatShiftRange,
  isSuspiciousShiftTime,
  shiftNetDurationMinutes,
  shiftSlotKind,
  type ShiftSlotKind,
} from "@/lib/planning/shift-display";

export const MON_FIRST_DOW = [1, 2, 3, 4, 5, 6, 0] as const;
export const WEEK_SHORT_MON = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

const SLOT_TITLES: Record<ShiftSlotKind, string> = {
  morning: "Frühschicht",
  day: "Tagschicht",
  evening: "Spätschicht",
  night: "Nachtschicht",
};

export function shiftSlotTitle(startTime: string): string {
  return SLOT_TITLES[shiftSlotKind(startTime)];
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
        title: shiftSlotTitle(s.startTime),
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

export const SHIFT_PRESETS = {
  morning: { startTime: "08:00", endTime: "16:00", label: "Früh 08–16" },
  standard: { startTime: "09:00", endTime: "17:00", label: "Standard 09–17" },
  evening: { startTime: "14:00", endTime: "22:00", label: "Spät 14–22" },
} as const;
