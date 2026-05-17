import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { berlinStartOfDayFromInstant, berlinStartOfDayFromIsoDate } from "@/lib/shift-tasks/berlin-day";
import { userErrorMessage } from "@/lib/errors/user-message";

export type GenerateTaskListResult =
  | { ok: true; shiftTaskListId: string; created: boolean; skipped: false }
  | { ok: true; skipped: true; reason: "NO_TEMPLATE" | "SHIFT_NOT_FOUND" }
  | { ok: false; error: string };

/**
 * Wählt ein Template: zuerst exakter Match auf staffingRole des Nutzers,
 * sonst globale Vorlage (staffingRole IS NULL) mit isDefault, sonst erste globale.
 */
async function resolveTemplateIdForUser(companyId: string, staffingRole: string | null): Promise<string | null> {
  const roleKey = staffingRole?.trim();
  if (roleKey) {
    const roleMatch = await db.taskTemplate.findFirst({
      where: tenantWhere(companyId, { staffingRole: roleKey }),
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      select: { id: true },
    });
    if (roleMatch) return roleMatch.id;
  }

  const globalDefault = await db.taskTemplate.findFirst({
    where: tenantWhere(companyId, { staffingRole: null, isDefault: true }),
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (globalDefault) return globalDefault.id;

  const anyGlobal = await db.taskTemplate.findFirst({
    where: tenantWhere(companyId, { staffingRole: null }),
    orderBy: { name: "asc" },
    select: { id: true },
  });
  return anyGlobal?.id ?? null;
}

/**
 * Legt für Schicht + Kalendertag eine Checklisten-Instanz an (idempotent).
 * Kein Session-Check — nur für vertrauenswürdige Server-Pfade (z. B. Clock-In).
 *
 * @param templateUserId Nutzer, dessen staffingRole das Template bestimmt (typisch: einstellende Person).
 */
export async function generateTaskListForShiftCore(params: {
  companyId: string;
  shiftId: string;
  /** Default: jetzt (Berlin-Kalendertag) */
  occurrenceAt?: Date;
  /** Alternative zu occurrenceAt: `YYYY-MM-DD` */
  occurrenceDateIso?: string;
  templateUserId?: string;
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

  let staffingRole: string | null = null;
  if (params.templateUserId) {
    const u = await db.user.findFirst({
      where: tenantWhere(companyId, { id: params.templateUserId }),
      select: { staffingRole: true },
    });
    staffingRole = u?.staffingRole?.trim() || null;
  }

  const templateId = await resolveTemplateIdForUser(companyId, staffingRole);
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
    const message = userErrorMessage(e, "Unbekannter Fehler");
    return { ok: false, error: message };
  }
}
