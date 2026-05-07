"use server";

import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import { revalidatePath } from "next/cache";

export async function confirmTimesheetMonth(monthKey: string) {
  const { userId, companyId } = await requireTenant();
  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    throw new Error("Ungültiger Monat.");
  }

  const member = await db.user.findFirst({
    where: tenantWhere(companyId, { id: userId }),
    select: { id: true },
  });
  if (!member) throw new Error("Profil nicht gefunden.");

  await db.timesheetAcknowledgment.upsert({
    where: { userId_monthKey: { userId, monthKey } },
    create: { userId, companyId, monthKey },
    update: { confirmedAt: new Date() },
  });

  revalidatePath("/dashboard/reports");
}
