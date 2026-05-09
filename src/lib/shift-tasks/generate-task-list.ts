import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { berlinStartOfDayFromInstant, berlinStartOfDayFromIsoDate } from "@/lib/shift-tasks/berlin-day";

export type GenerateTaskListResult =
  | { ok: true; shiftTaskListId: string; created: boolean; skipped: false }
  | { ok: true; skipped: true; reason: "NO_TEMPLATE" | "SHIFT_NOT_FOUND" }
  | { ok: false; error: string };

async function resolveDefaultTemplateId(companyId: string): Promise<string | null> {
  const preferred = await db.taskTemplate.findFirst({
    where: tenantWhere(companyId, { isDefault: true }),
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (preferred) return preferred.id;

  const any = await db.taskTemplate.findFirst({
    where: tenantWhere(companyId, {}),
    orderBy: { name: "asc" },
    select: { id: true },
  });
  return any?.id ?? null;
}

/**
 * Legt für Schicht + Kalendertag eine Checklisten-Instanz an (idempotent).
 * Kein Session-Check — nur für vertrauenswürdige Server-Pfade (z. B. Clock-In).
 */
export async function generateTaskListForShiftCore(params: {
  companyId: string;
  shiftId: string;
  /** Default: jetzt (Berlin-Kalendertag) */
  occurrenceAt?: Date;
  /** Alternative zu occurrenceAt: `YYYY-MM-DD` */
  occurrenceDateIso?: string;
}): Promise<GenerateTaskListResult> {
  const { companyId, shiftId } = params;
  const occurrenceDate = params.occurrenceDateIso
    ? berlinStartOfDayFromIsoDate(params.occurrenceDateIso)
    : berlinStartOfDayFromInstant(params.occurrenceAt ?? new Date());

  const shift = await db.shift.findFirst({
    where: tenantWhere(companyId, { id: shiftId }),
    select: { id: true },
  });
  if (!shift) return { ok: true, skipped: true, reason: "SHIFT_NOT_FOUND" };

  const existing = await db.shiftTaskList.findUnique({
    where: { shiftId_occurrenceDate: { shiftId, occurrenceDate } },
    select: { id: true },
  });
  if (existing) return { ok: true, shiftTaskListId: existing.id, created: false, skipped: false };

  const templateId = await resolveDefaultTemplateId(companyId);
  if (!templateId) return { ok: true, skipped: true, reason: "NO_TEMPLATE" };

  const templateItems = await db.taskTemplateItem.findMany({
    where: { templateId },
    orderBy: { sortOrder: "asc" },
    select: { title: true, sortOrder: true, isRequired: true },
  });

  try {
    const list = await db.shiftTaskList.create({
      data: {
        companyId,
        shiftId,
        taskTemplateId: templateId,
        occurrenceDate,
        items: {
          create: templateItems.map((it) => ({
            title: it.title,
            sortOrder: it.sortOrder,
            isRequired: it.isRequired,
          })),
        },
      },
      select: { id: true },
    });
    return { ok: true, shiftTaskListId: list.id, created: true, skipped: false };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    return { ok: false, error: message };
  }
}
