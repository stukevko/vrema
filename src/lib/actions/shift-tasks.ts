"use server";

import { revalidatePath } from "next/cache";
import { ShiftTaskItemStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import { generateTaskListForShiftCore } from "@/lib/shift-tasks/generate-task-list";
import {
  queryActiveShiftTasks,
  type ActiveShiftTaskItemDTO,
  type ActiveShiftTasksDTO,
} from "@/lib/shift-tasks/active-shift-tasks-data";
import { berlinStartOfDayFromInstant } from "@/lib/shift-tasks/berlin-day";
import { getDayBoundsUtc } from "@/lib/time/timezone";

const MANAGER_ROLES = new Set(["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN", "SUPPORT"]);

export async function generateTaskListForShift(shiftId: string, occurrenceDateIso?: string) {
  const { companyId, role } = await requireTenant();
  if (!MANAGER_ROLES.has(role ?? "")) {
    throw new Error("Keine Berechtigung für diese Aktion.");
  }
  if (!shiftId?.trim()) throw new Error("Schicht-ID fehlt.");

  const shift = await db.shift.findFirst({
    where: tenantWhere(companyId, { id: shiftId.trim() }),
    select: { id: true, userId: true },
  });
  if (!shift) throw new Error("Schicht nicht gefunden.");

  return generateTaskListForShiftCore({
    companyId,
    shiftId: shift.id,
    templateUserId: shift.userId,
    ...(occurrenceDateIso ? { occurrenceDateIso: occurrenceDateIso.trim() } : {}),
  });
}

export type { ActiveShiftTaskItemDTO, ActiveShiftTasksDTO };

/** Checkliste für die aktuelle Schicht des Nutzers (heute, Berlin). */
export async function getMyActiveShiftTasks(): Promise<ActiveShiftTasksDTO> {
  const { userId, companyId } = await requireTenant();
  return queryActiveShiftTasks(userId, companyId);
}

export async function toggleShiftTaskItem(itemId: string, nextDone: boolean) {
  const { userId, companyId } = await requireTenant();
  if (!itemId?.trim()) throw new Error("Aufgabe fehlt.");

  const now = new Date();
  const { start: logStart, end: logEnd } = getDayBoundsUtc("Europe/Berlin", now);

  const openLog = await db.workLog.findFirst({
    where: tenantWhere(companyId, {
      userId,
      clockOut: null,
      clockIn: { gte: logStart, lte: logEnd },
    }),
    select: { id: true },
  });
  if (!openLog) {
    throw new Error("Aufgaben nur während einer aktiven Schicht änderbar.");
  }

  const dayStart = berlinStartOfDayFromInstant(now);

  const item = await db.shiftTaskItem.findFirst({
    where: {
      id: itemId.trim(),
      list: {
        companyId,
        occurrenceDate: dayStart,
        shift: { userId },
      },
    },
    select: { id: true, status: true },
  });

  if (!item) throw new Error("Aufgabe nicht gefunden.");

  const status: ShiftTaskItemStatus = nextDone ? "DONE" : "PENDING";

  await db.shiftTaskItem.update({
    where: { id: item.id },
    data: {
      status,
      completedAt: nextDone ? new Date() : null,
      completedByUserId: nextDone ? userId : null,
    },
  });

  revalidatePath("/dashboard");
  return { ok: true as const, status };
}
