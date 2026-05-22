"use server";

import { db } from "@/lib/db";
import { normalizeShiftTimesForSave } from "@/lib/planning/shift-display";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
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

/** Einzelne Schicht-Zuweisung vom Planer-Board entfernen (per ID). */
export async function removePlannerShift(shiftId: string): Promise<PlannerShiftRemoveResult> {
  try {
    const { companyId, role } = await requireTenant();
    if (!role || !MANAGER_ROLES.includes(role as (typeof MANAGER_ROLES)[number])) {
      return { ok: false, error: "Keine Berechtigung." };
    }

    const id = typeof shiftId === "string" ? shiftId.trim() : "";
    if (!id) return { ok: false, error: "Ungültige Schicht-Referenz." };

    const deleted = await db.shift.deleteMany({
      where: tenantWhere(companyId, { id }),
    });
    if (deleted.count === 0) {
      return { ok: false, error: "Schicht nicht gefunden — bitte Seite neu laden." };
    }

    revalidatePlannerPaths();
    return { ok: true };
  } catch (err) {
    logServerError("planner.removePlannerShift", err, { shiftId });
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
  try {
    const { companyId, role } = await requireTenant();
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

    const deleted = await db.shift.deleteMany({
      where: tenantWhere(companyId, {
        weekIndex,
        dayOfWeek,
        startTime,
        endTime,
      }),
    });

    revalidatePlannerPaths();
    return { ok: true, removed: deleted.count };
  } catch (err) {
    logServerError("planner.clearPlannerShiftSlot", err, input);
    return { ok: false, error: "Schichtkarte konnte nicht geleert werden." };
  }
}
