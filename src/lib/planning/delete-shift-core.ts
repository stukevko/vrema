import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { logServerError } from "@/lib/server-logger";

function isShiftTaskListUnavailable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /ShiftTaskList|relation.*does not exist|P2021/i.test(msg);
}

/** Löscht eine Schicht inkl. Checklisten — ohne revalidatePath (vermeidet RSC-500 nach Action). */
export async function deletePlannerShiftCore(companyId: string, shiftId: string): Promise<number> {
  const id = shiftId.trim();
  if (!id) return 0;

  try {
    return await db.$transaction(async (tx) => {
      await tx.shiftTaskList.deleteMany({
        where: tenantWhere(companyId, { shiftId: id }),
      });
      const deleted = await tx.shift.deleteMany({
        where: tenantWhere(companyId, { id }),
      });
      return deleted.count;
    });
  } catch (err) {
    if (!isShiftTaskListUnavailable(err)) throw err;
    logServerError("planner.deleteShiftCore.fallback", err, { shiftId: id, companyId });
    const deleted = await db.shift.deleteMany({
      where: tenantWhere(companyId, { id }),
    });
    return deleted.count;
  }
}
