"use server";

import { requireTenant } from "@/lib/tenant-guard";
import { generateTaskListForShiftCore } from "@/lib/shift-tasks/generate-task-list";

const MANAGER_ROLES = new Set(["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN", "SUPPORT"]);

export async function generateTaskListForShift(shiftId: string, occurrenceDateIso?: string) {
  const { companyId, role } = await requireTenant();
  if (!MANAGER_ROLES.has(role ?? "")) {
    throw new Error("Keine Berechtigung für diese Aktion.");
  }
  if (!shiftId?.trim()) throw new Error("Schicht-ID fehlt.");

  return generateTaskListForShiftCore({
    companyId,
    shiftId: shiftId.trim(),
    ...(occurrenceDateIso ? { occurrenceDateIso: occurrenceDateIso.trim() } : {}),
  });
}
