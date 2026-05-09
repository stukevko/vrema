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

  const lists = await db.shiftTaskList.findMany({
    where: tenantWhere(companyId, {
      occurrenceDate: dayStart,
      shift: { userId: { in: liveIds } },
    }),
    include: {
      shift: {
        select: {
          userId: true,
          startTime: true,
          endTime: true,
          user: { select: { name: true, email: true } },
        },
      },
      template: { select: { name: true } },
      items: { select: { status: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return lists.map((list) => {
    const total = list.items.length;
    const doneCount = list.items.filter((i) => i.status === "DONE").length;
    const u = list.shift.user;
    return {
      listId: list.id,
      templateName: list.template?.name ?? null,
      userName: u.name,
      userEmail: u.email,
      shiftLabel: `${list.shift.startTime}–${list.shift.endTime}`,
      doneCount,
      totalCount: total,
      isLive: liveUserIds.has(list.shift.userId),
    };
  });
}
