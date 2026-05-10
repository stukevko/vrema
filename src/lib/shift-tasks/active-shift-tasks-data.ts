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

/**
 * Reine DB-Abfrage (RSC + Server Action).
 *
 * Performance: Der Caller kann `cycleWeeksHint` übergeben, um einen redundanten
 * Company-Lookup zu sparen, wenn er den Wert bereits hat (z. B. Dashboard-Page).
 */
export async function queryActiveShiftTasks(
  userId: string,
  companyId: string,
  cycleWeeksHint?: number,
): Promise<ActiveShiftTasksDTO> {
  let cycleWeeks = cycleWeeksHint ?? null;
  if (cycleWeeks === null) {
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { shiftCycleWeeks: true },
    });
    if (!company) return null;
    cycleWeeks = company.shiftCycleWeeks;
  }

  const now = new Date();
  const weekIndex = getWeekCycleIndex(now, cycleWeeks);
  const dayOfWeek = now.getDay();
  const occurrenceDate = berlinStartOfDayFromInstant(now);

  // Shift + zugehörige Liste (inkl. Items) in EINEM Roundtrip statt zwei.
  // Bewusst KEIN `isDraft: false`-Filter: wenn jemand für eine noch ungenehmigte
  // Autopilot-Schicht eingestempelt ist, soll er trotzdem seine Tasks sehen.
  const shift = await db.shift.findFirst({
    where: tenantWhere(companyId, { userId, dayOfWeek, weekIndex }),
    orderBy: { startTime: "asc" },
    select: {
      id: true,
      shiftTaskLists: {
        where: { occurrenceDate },
        select: {
          id: true,
          template: { select: { name: true } },
          items: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, title: true, status: true, sortOrder: true },
          },
        },
        take: 1,
      },
    },
  });
  if (!shift) return null;
  const list = shift.shiftTaskLists[0];
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
