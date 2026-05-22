"use server";

import { db } from "@/lib/db";
import { normalizeShiftTimesForSave } from "@/lib/planning/shift-display";
import { requireTenantAction, tenantWhere } from "@/lib/tenant-guard";
import { logServerError } from "@/lib/server-logger";
import { revalidatePath } from "next/cache";

const MANAGER_ROLES = ["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"] as const;

function revalidatePlannerPaths() {
  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard");
}

export type PlannerShiftRemoveResult =
  | { ok: true }
  | { ok: false; error: string };

export type PlannerShiftClearSlotResult =
  | { ok: true; removed: number }
  | { ok: false; error: string };

function isShiftTaskListUnavailable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /ShiftTaskList|relation.*does not exist|P2021/i.test(msg);
}

async function deleteShiftById(companyId: string, shiftId: string): Promise<number> {
  try {
    return await db.$transaction(async (tx) => {
      await tx.shiftTaskList.deleteMany({
        where: tenantWhere(companyId, { shiftId }),
      });
      const deleted = await tx.shift.deleteMany({
        where: tenantWhere(companyId, { id: shiftId }),
      });
      return deleted.count;
    });
  } catch (err) {
    if (!isShiftTaskListUnavailable(err)) throw err;
    logServerError("planner.deleteShiftById.fallback", err, { shiftId });
    const deleted = await db.shift.deleteMany({
      where: tenantWhere(companyId, { id: shiftId }),
    });
    return deleted.count;
  }
}

/** Einzelne Schicht-Zuweisung vom Planer-Board entfernen (per ID). */
export async function removePlannerShift(shiftId: string): Promise<PlannerShiftRemoveResult> {
  const tenant = await requireTenantAction();
  if (!tenant.ok) return { ok: false, error: tenant.error };

  const { companyId, role } = tenant;
  if (!role || !MANAGER_ROLES.includes(role as (typeof MANAGER_ROLES)[number])) {
    return { ok: false, error: "Keine Berechtigung." };
  }

  const id = typeof shiftId === "string" ? shiftId.trim() : "";
  if (!id) return { ok: false, error: "Ungültige Schicht-Referenz." };

  try {
    const count = await deleteShiftById(companyId, id);
    if (count === 0) {
      return { ok: false, error: "Schicht nicht gefunden — bitte Seite neu laden." };
    }
    revalidatePlannerPaths();
    return { ok: true };
  } catch (err) {
    logServerError("planner.removePlannerShift", err, { shiftId: id, companyId });
    return { ok: false, error: "Schicht konnte nicht entfernt werden. Bitte erneut versuchen." };
  }
}

/** Alle Zuweisungen einer Schichtkarte (Tag + Zeitfenster) entfernen. */
export async function clearPlannerShiftSlot(input: {
  weekIndex?: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}): Promise<PlannerShiftClearSlotResult> {
  const tenant = await requireTenantAction();
  if (!tenant.ok) return { ok: false, error: tenant.error };

  const { companyId, role } = tenant;
  if (!role || !MANAGER_ROLES.includes(role as (typeof MANAGER_ROLES)[number])) {
    return { ok: false, error: "Keine Berechtigung." };
  }

  const weekIndex = Math.min(3, Math.max(1, Math.floor(input.weekIndex ?? 1)));
  const dayOfWeek = Math.min(6, Math.max(0, Math.floor(input.dayOfWeek)));

  let startTime: string;
  let endTime: string;
  try {
    ({ startTime, endTime } = normalizeShiftTimesForSave(input.startTime, input.endTime));
  } catch (normErr) {
    logServerError("planner.clearPlannerShiftSlot.normalize", normErr, input);
    return { ok: false, error: "Ungültige Schichtzeiten." };
  }

  try {
    const matches = await db.shift.findMany({
      where: tenantWhere(companyId, { weekIndex, dayOfWeek, startTime, endTime }),
      select: { id: true },
    });
    if (matches.length === 0) {
      return { ok: true, removed: 0 };
    }

    let removed = 0;
    for (const row of matches) {
      removed += await deleteShiftById(companyId, row.id);
    }

    revalidatePlannerPaths();
    return { ok: true, removed };
  } catch (err) {
    logServerError("planner.clearPlannerShiftSlot", err, { companyId, weekIndex, dayOfWeek, startTime, endTime });
    return { ok: false, error: "Schichtkarte konnte nicht geleert werden." };
  }
}
