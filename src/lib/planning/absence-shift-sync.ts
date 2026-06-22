import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { plannerSlotsForBerlinDateRange } from "@/lib/planning/absence-planner-slots";
import { logServerError } from "@/lib/server-logger";

function isShiftTaskListUnavailable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /ShiftTaskList|relation.*does not exist|P2021/i.test(msg);
}

/**
 * Entfernt geplante Schichten für genehmigte Abwesenheit (Krank/Urlaub).
 * Entspricht dem Freizeitausgleich-Flow im Planer-Board.
 */
export async function removeShiftsForApprovedAbsenceRange(params: {
  companyId: string;
  userId: string;
  startDate: Date;
  endDate: Date;
}): Promise<number> {
  const company = await db.company.findUnique({
    where: { id: params.companyId },
    select: { shiftCycleWeeks: true },
  });
  const slots = plannerSlotsForBerlinDateRange(
    params.startDate,
    params.endDate,
    company?.shiftCycleWeeks,
  );
  if (slots.length === 0) return 0;

  try {
    return await db.$transaction(async (tx) => {
      const shifts = await tx.shift.findMany({
        where: tenantWhere(params.companyId, {
          userId: params.userId,
          isDraft: false,
          OR: slots.map((s) => ({ weekIndex: s.weekIndex, dayOfWeek: s.dayOfWeek })),
        }),
        select: { id: true },
      });
      const ids = shifts.map((s) => s.id);
      if (ids.length === 0) return 0;

      await tx.shiftTaskList.deleteMany({
        where: tenantWhere(params.companyId, { shiftId: { in: ids } }),
      });
      const deleted = await tx.shift.deleteMany({
        where: tenantWhere(params.companyId, { id: { in: ids } }),
      });
      return deleted.count;
    });
  } catch (err) {
    if (!isShiftTaskListUnavailable(err)) throw err;
    logServerError("absence.removeShifts.fallback", err, {
      companyId: params.companyId,
      userId: params.userId,
    });
    const deleted = await db.shift.deleteMany({
      where: tenantWhere(params.companyId, {
        userId: params.userId,
        isDraft: false,
        OR: slots.map((s) => ({ weekIndex: s.weekIndex, dayOfWeek: s.dayOfWeek })),
      }),
    });
    return deleted.count;
  }
}
