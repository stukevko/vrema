"use server";

import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import { revalidatePath } from "next/cache";
import { sendVacationStatusEmail } from "@/lib/actions/emails";
import { AbsenceRequestStatus, AbsenceType, VacationStatus } from "@prisma/client";

export async function requestVacation(data: {
  startDate: Date;
  endDate: Date;
  reason?: string;
}) {
  const { userId, companyId } = await requireTenant();

  const diffTime = Math.abs(data.endDate.getTime() - data.startDate.getTime());
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const request = await db.vacationRequest.create({
    data: {
      companyId,
      userId,
      absenceType: AbsenceType.VACATION,
      startDate: data.startDate,
      endDate: data.endDate,
      days,
      reason: data.reason,
    },
  });
  await db.absence.create({
    data: {
      userId,
      orgId: companyId,
      type: AbsenceType.VACATION,
      start: data.startDate,
      end: data.endDate,
      status: AbsenceRequestStatus.REQUESTED,
      reason: data.reason,
      sourceVacationRequestId: request.id,
    },
  });

  revalidatePath("/dashboard/vacation");
  revalidatePath("/dashboard/planning");
  return request;
}

export async function requestSickLeave(data: {
  startDate: Date;
  endDate: Date;
  note?: string;
}) {
  const { userId, companyId } = await requireTenant();

  const diffTime = Math.abs(data.endDate.getTime() - data.startDate.getTime());
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const request = await db.vacationRequest.create({
    data: {
      companyId,
      userId,
      absenceType: AbsenceType.SICK,
      startDate: data.startDate,
      endDate: data.endDate,
      days,
      status: VacationStatus.APPROVED,
      approvedAt: new Date(),
      reason: data.note?.trim() || null,
    },
  });
  await db.absence.create({
    data: {
      userId,
      orgId: companyId,
      type: AbsenceType.SICK,
      start: data.startDate,
      end: data.endDate,
      status: AbsenceRequestStatus.APPROVED,
      reason: data.note?.trim() || null,
      sourceVacationRequestId: request.id,
      reviewedById: userId,
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/vacation");
  revalidatePath("/dashboard/planning");
  return request;
}

export async function approveVacation(requestId: string) {
  const { userId, companyId, role } = await requireTenant();

  if (role !== "COMPANY_OWNER" && role !== "MANAGER" && role !== "SUPER_ADMIN") {
    throw new Error("Keine Berechtigung");
  }

  const request = await db.vacationRequest.findFirst({
    where: tenantWhere(companyId, { id: requestId }),
  });

  if (!request) throw new Error("Antrag nicht gefunden");

  const updated = await db.vacationRequest.update({
    where: { id: requestId },
    data: { status: "APPROVED", approvedById: userId, approvedAt: new Date() },
    include: {
      user: { select: { name: true, email: true } },
      approvedBy: { select: { name: true } },
    },
  });
  await db.absence.updateMany({
    where: { sourceVacationRequestId: requestId },
    data: {
      status: AbsenceRequestStatus.APPROVED,
      reviewedById: userId,
      reviewedAt: new Date(),
    },
  });

  await sendVacationStatusEmail({
    recipientName: updated.user.name ?? updated.user.email,
    recipientEmail: updated.user.email,
    status: "APPROVED",
    startDate: updated.startDate,
    endDate: updated.endDate,
    days: updated.days,
    approvedByName: updated.approvedBy?.name ?? "Manager",
  });

  revalidatePath("/dashboard/vacation");
  return updated;
}

export async function rejectVacation(requestId: string) {
  const { userId, companyId, role } = await requireTenant();

  if (role !== "COMPANY_OWNER" && role !== "MANAGER" && role !== "SUPER_ADMIN") {
    throw new Error("Keine Berechtigung");
  }

  const request = await db.vacationRequest.findFirst({
    where: tenantWhere(companyId, { id: requestId }),
  });

  if (!request) throw new Error("Antrag nicht gefunden");

  const updated = await db.vacationRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED", approvedById: userId, approvedAt: new Date() },
    include: {
      user: { select: { name: true, email: true } },
      approvedBy: { select: { name: true } },
    },
  });
  await db.absence.updateMany({
    where: { sourceVacationRequestId: requestId },
    data: {
      status: AbsenceRequestStatus.REJECTED,
      reviewedById: userId,
      reviewedAt: new Date(),
    },
  });

  await sendVacationStatusEmail({
    recipientName: updated.user.name ?? updated.user.email,
    recipientEmail: updated.user.email,
    status: "REJECTED",
    startDate: updated.startDate,
    endDate: updated.endDate,
    days: updated.days,
    approvedByName: updated.approvedBy?.name ?? "Manager",
  });

  revalidatePath("/dashboard/vacation");
  return updated;
}

export async function getMyVacationRequests() {
  const { userId, companyId } = await requireTenant();

  return db.vacationRequest.findMany({
    where: tenantWhere(companyId, { userId }),
    orderBy: { createdAt: "desc" },
    include: { approvedBy: { select: { name: true } } },
  });
}

export async function getAllVacationRequests() {
  const { companyId, role } = await requireTenant();

  if (role !== "COMPANY_OWNER" && role !== "MANAGER" && role !== "SUPER_ADMIN") {
    throw new Error("Keine Berechtigung");
  }

  return db.vacationRequest.findMany({
    where: tenantWhere(companyId),
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      approvedBy: { select: { name: true } },
    },
  });
}

export async function getVacationConflictDaysForPlanning() {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) return [];

  const now = new Date();
  const horizonEnd = new Date(now);
  horizonEnd.setDate(horizonEnd.getDate() + 120);

  const requests = await db.vacationRequest.findMany({
    where: tenantWhere(companyId, {
      status: VacationStatus.APPROVED,
      endDate: { gte: now },
      startDate: { lte: horizonEnd },
    }),
    select: {
      userId: true,
      startDate: true,
      endDate: true,
      absenceType: true,
    },
  });
  const absences = await db.absence.findMany({
    where: tenantWhere(companyId, {
      status: AbsenceRequestStatus.APPROVED,
      end: { gte: now },
      start: { lte: horizonEnd },
    }),
    select: {
      userId: true,
      start: true,
      end: true,
      type: true,
    },
  });

  const conflicts = new Map<string, "VACATION" | "SICK">();
  for (const req of requests) {
    const conflictType: "VACATION" | "SICK" = req.absenceType === AbsenceType.SICK ? "SICK" : "VACATION";
    const cursor = new Date(req.startDate);
    const end = new Date(req.endDate);
    while (cursor <= end) {
      const key = `${req.userId}-${cursor.getDay()}`;
      const existing = conflicts.get(key);
      if (existing !== "SICK") {
        conflicts.set(key, conflictType);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  for (const req of absences) {
    const conflictType: "VACATION" | "SICK" = req.type === AbsenceType.SICK ? "SICK" : "VACATION";
    const cursor = new Date(req.start);
    const end = new Date(req.end);
    while (cursor <= end) {
      const key = `${req.userId}-${cursor.getDay()}`;
      const existing = conflicts.get(key);
      if (existing !== "SICK") {
        conflicts.set(key, conflictType);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return Array.from(conflicts.entries()).map(([entry, type]) => {
    const [userId, day] = entry.split("-");
    return { userId, dayOfWeek: Number(day), type };
  });
}
