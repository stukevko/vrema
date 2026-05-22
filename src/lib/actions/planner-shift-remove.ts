"use server";

import { deletePlannerShiftCore } from "@/lib/planning/delete-shift-core";
import { normalizeShiftTimesForSave } from "@/lib/planning/shift-display";
import { db } from "@/lib/db";
import { requireTenantAction, tenantWhere } from "@/lib/tenant-guard";
import { logServerError } from "@/lib/server-logger";

const MANAGER_ROLES = ["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"] as const;

export type PlannerShiftRemoveResult =
  | { ok: true }
  | { ok: false; error: string };

export type PlannerShiftClearSlotResult =
  | { ok: true; removed: number }
  | { ok: false; error: string };

function coerceShiftId(raw: unknown): string {
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0].trim();
  return "";
}

function canManagePlanner(role: string | undefined): boolean {
  return Boolean(role && MANAGER_ROLES.includes(role as (typeof MANAGER_ROLES)[number]));
}

/** Einzelne Schicht-Zuweisung vom Planer-Board entfernen (per ID). */
export async function removePlannerShift(shiftId: unknown): Promise<PlannerShiftRemoveResult> {
  const tenant = await requireTenantAction();
  if (!tenant.ok) return { ok: false, error: tenant.error };
  if (!canManagePlanner(tenant.role)) return { ok: false, error: "Keine Berechtigung." };

  const id = coerceShiftId(shiftId);
  if (!id) return { ok: false, error: "Ungültige Schicht-Referenz." };

  try {
    const count = await deletePlannerShiftCore(tenant.companyId, id);
    if (count === 0) {
      return { ok: false, error: "Schicht nicht gefunden — bitte Seite neu laden." };
    }
    return { ok: true };
  } catch (err) {
    logServerError("planner.removePlannerShift", err, { shiftId: id, companyId: tenant.companyId });
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
  if (!canManagePlanner(tenant.role)) return { ok: false, error: "Keine Berechtigung." };

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
      where: tenantWhere(tenant.companyId, { weekIndex, dayOfWeek, startTime, endTime }),
      select: { id: true },
    });

    let removed = 0;
    for (const row of matches) {
      removed += await deletePlannerShiftCore(tenant.companyId, row.id);
    }

    return { ok: true, removed };
  } catch (err) {
    logServerError("planner.clearPlannerShiftSlot", err, {
      companyId: tenant.companyId,
      weekIndex,
      dayOfWeek,
      startTime,
      endTime,
    });
    return { ok: false, error: "Schichtkarte konnte nicht geleert werden." };
  }
}
