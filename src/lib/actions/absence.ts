"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant-guard";
import { sendVacationStatusEmail } from "@/lib/email/transactional";
import type { AbsenceRequestStatus, VacationStatus } from "@prisma/client";
import { countBerlinCalendarDaysInclusive } from "@/lib/time/timezone";

export async function listAbsencesForManagers() {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }
  return db.absence.findMany({
    where: { orgId: companyId },
    include: {
      user: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function decideAbsence(input: {
  absenceId: string;
  status: AbsenceRequestStatus;
}) {
  const { companyId, role, userId } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  // RLS-Defense: ZUERST gegen `orgId` validieren, BEVOR wir die Mutation
  // ausführen. Sonst könnte ein Manager mit einer geleakten/erratenen
  // `absenceId` einer fremden Firma die Daten bereits umschreiben, bevor der
  // nachgelagerte Check den Fehler wirft.
  const existing = await db.absence.findFirst({
    where: { id: input.absenceId, orgId: companyId },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Abwesenheit gehört nicht zu Ihrer Organisation.");
  }

  const updated = await db.absence.update({
    where: { id: existing.id },
    data: {
      status: input.status,
      reviewedById: userId,
      reviewedAt: new Date(),
    },
    include: {
      user: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true } },
    },
  });

  if (updated.sourceVacationRequestId) {
    const mappedStatus: VacationStatus =
      input.status === "APPROVED" ? "APPROVED" : input.status === "REJECTED" ? "REJECTED" : "PENDING";
    await db.vacationRequest.updateMany({
      where: { id: updated.sourceVacationRequestId, companyId },
      data: {
        status: mappedStatus,
        approvedById: userId,
        approvedAt: new Date(),
      },
    });
  }

  if (input.status === "APPROVED" || input.status === "REJECTED") {
    await sendVacationStatusEmail({
      recipientName: updated.user.name ?? updated.user.email,
      recipientEmail: updated.user.email,
      status: input.status === "APPROVED" ? "APPROVED" : "REJECTED",
      startDate: updated.start,
      endDate: updated.end,
      days: countBerlinCalendarDaysInclusive(updated.start, updated.end),
      approvedByName: updated.reviewedBy?.name ?? "Manager",
    });
  }

  revalidatePath("/dashboard/team/absences");
  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard/vacation");
}
