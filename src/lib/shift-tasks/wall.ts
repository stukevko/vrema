import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { berlinStartOfDayFromInstant } from "@/lib/shift-tasks/berlin-day";
import { getDayBoundsUtc } from "@/lib/time/timezone";

export type ShiftTaskWallRow = {
  listId: string;
  templateName: string | null;
  userName: string | null;
  userEmail: string;
  shiftLabel: string;
  /** Anzeige z. B. „Küche“ für Live-Operations */
  roleLabel: string;
  doneCount: number;
  totalCount: number;
  isLive: boolean;
};

export async function getTodayShiftTaskWall(companyId: string): Promise<ShiftTaskWallRow[]> {
  const now = new Date();
  const dayStart = berlinStartOfDayFromInstant(now);
  const { start: logStart, end: logEnd } = getDayBoundsUtc("Europe/Berlin", now);

  const openLogs = await db.workLog.findMany({
    where: tenantWhere(companyId, {
      clockOut: null,
      clockIn: { gte: logStart, lte: logEnd },
    }),
    select: { userId: true },
  });
  const liveUserIds = new Set(openLogs.map((l) => l.userId));

  const liveIds = [...liveUserIds];
  if (liveIds.length === 0) return [];

  // Hard cap: niemand braucht >50 parallele Listen im Live-Operations-Widget.
  // Schützt gegen Pathologien (große Teams + viele Listen pro Schicht).
  const lists = await db.shiftTaskList.findMany({
    where: tenantWhere(companyId, {
      occurrenceDate: dayStart,
      shift: { userId: { in: liveIds } },
    }),
    select: {
      id: true,
      shift: {
        select: {
          userId: true,
          startTime: true,
          endTime: true,
          staffingRole: true,
          user: { select: { name: true, email: true, staffingRole: true } },
        },
      },
      template: { select: { name: true } },
      items: { select: { status: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  return lists.map((list) => {
    const total = list.items.length;
    const doneCount = list.items.filter((i) => i.status === "DONE").length;
    const u = list.shift.user;
    const roleLabel =
      list.shift.staffingRole?.trim() ||
      u.staffingRole?.trim() ||
      u.name?.trim() ||
      u.email.split("@")[0] ||
      "Team";
    return {
      listId: list.id,
      templateName: list.template?.name ?? null,
      userName: u.name,
      userEmail: u.email,
      shiftLabel: `${list.shift.startTime}–${list.shift.endTime}`,
      roleLabel,
      doneCount,
      totalCount: total,
      isLive: liveUserIds.has(list.shift.userId),
    };
  });
}
