import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { berlinStartOfDayFromInstant } from "@/lib/shift-tasks/berlin-day";
import { getWeekCycleIndex } from "@/lib/shift-cycle";
import type { ShiftTaskItemStatus } from "@prisma/client";

export type ActiveShiftTaskItemDTO = {
  id: string;
  title: string;
  status: ShiftTaskItemStatus;
  sortOrder: number;
};

export type ActiveShiftTasksDTO = {
  listId: string;
  templateName: string | null;
  items: ActiveShiftTaskItemDTO[];
} | null;

/** Reine DB-Abfrage (RSC + Server Action). */
export async function queryActiveShiftTasks(userId: string, companyId: string): Promise<ActiveShiftTasksDTO> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { shiftCycleWeeks: true },
  });
  if (!company) return null;

  const now = new Date();
  const weekIndex = getWeekCycleIndex(now, company.shiftCycleWeeks);
  const dayOfWeek = now.getDay();

  const shift = await db.shift.findFirst({
    where: tenantWhere(companyId, { userId, dayOfWeek, weekIndex }),
    orderBy: { startTime: "asc" },
    select: { id: true },
  });
  if (!shift) return null;

  const occurrenceDate = berlinStartOfDayFromInstant(now);

  const list = await db.shiftTaskList.findUnique({
    where: { shiftId_occurrenceDate: { shiftId: shift.id, occurrenceDate } },
    include: {
      template: { select: { name: true } },
      items: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, status: true, sortOrder: true } },
    },
  });

  if (!list || list.items.length === 0) return null;

  return {
    listId: list.id,
    templateName: list.template?.name ?? null,
    items: list.items.map((i) => ({
      id: i.id,
      title: i.title,
      status: i.status as ShiftTaskItemStatus,
      sortOrder: i.sortOrder,
    })),
  };
}
