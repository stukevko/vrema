"use server";

import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import { revalidatePath } from "next/cache";
import { userErrorMessage } from "@/lib/errors/user-message";

export type ConfirmTimesheetResult = { ok: true } | { ok: false; error: string };

/** Monats-Stundenzettel bestätigen — Result statt throw für zuverlässiges Mobile-Feedback. */
export async function confirmTimesheetMonth(monthKey: string): Promise<ConfirmTimesheetResult> {
  try {
    const { userId, companyId } = await requireTenant();
    if (!/^\d{4}-\d{2}$/.test(monthKey)) {
      return { ok: false, error: "Ungültiger Monat." };
    }

    const member = await db.user.findFirst({
      where: tenantWhere(companyId, { id: userId }),
      select: { id: true },
    });
    if (!member) return { ok: false, error: "Profil nicht gefunden." };

    await db.timesheetAcknowledgment.upsert({
      where: { userId_monthKey: { userId, monthKey } },
      create: { userId, companyId, monthKey },
      update: { confirmedAt: new Date() },
    });

    revalidatePath("/dashboard/reports");
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: userErrorMessage(err, "Bestätigung fehlgeschlagen.") };
  }
}
