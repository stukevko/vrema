"use server";

import { revalidatePath } from "next/cache";
import { AbsenceRequestStatus, AbsenceType, UserRole, VacationStatus, VacationWishStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import { removeShiftsForApprovedAbsenceRange } from "@/lib/planning/absence-shift-sync";
import {
  countBerlinCalendarDaysInclusive,
  formatBerlinDate,
  getBerlinDayBoundsUtc,
} from "@/lib/time/timezone";
import { createNotification } from "@/lib/notifications/create";

export type VacationWishRow = {
  id: string;
  userId: string;
  userName: string;
  year: number;
  startDate: Date;
  endDate: Date;
  days: number;
  note: string | null;
  status: VacationWishStatus;
  submittedAt: Date | null;
};

async function ensurePlanYear(companyId: string, year: number) {
  return db.vacationPlanYear.upsert({
    where: { companyId_year: { companyId, year } },
    create: { companyId, year, submissionsOpen: true },
    update: {},
  });
}

export async function getVacationPlanContext(year: number) {
  const { companyId, userId, role } = await requireTenant();
  const planYear = await ensurePlanYear(companyId, year);
  const isManager = ["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role);

  const myWishes = await db.vacationWish.findMany({
    where: tenantWhere(companyId, { userId, year }),
    orderBy: { startDate: "asc" },
  });

  const teamWishes = isManager
    ? await db.vacationWish.findMany({
        where: tenantWhere(companyId, { year }),
        orderBy: [{ status: "asc" }, { startDate: "asc" }],
        include: { user: { select: { name: true, email: true } } },
      })
    : [];

  const members = isManager
    ? await db.user.findMany({
        where: tenantWhere(companyId, { isActive: true, role: { not: UserRole.ADVISOR } }),
        select: { id: true, name: true, email: true, vacationDays: true },
        orderBy: { name: "asc" },
      })
    : [];

  return {
    year,
    submissionsOpen: planYear.submissionsOpen,
    isManager,
    myWishes,
    teamWishes: teamWishes.map((w) => ({
      id: w.id,
      userId: w.userId,
      userName: w.user.name ?? w.user.email,
      year: w.year,
      startDate: w.startDate,
      endDate: w.endDate,
      days: w.days,
      note: w.note,
      status: w.status,
      submittedAt: w.submittedAt,
    })),
    members,
  };
}

export async function addVacationWish(data: { startDate: Date; endDate: Date; note?: string }) {
  const { userId, companyId } = await requireTenant();
  const startBounds = getBerlinDayBoundsUtc(data.startDate);
  const endBounds = getBerlinDayBoundsUtc(data.endDate);
  const year = new Date(startBounds.start).getFullYear();
  const planYear = await ensurePlanYear(companyId, year);
  if (!planYear.submissionsOpen) {
    throw new Error("Der Urlaubsplan ist für neue Wünsche geschlossen.");
  }

  const days = countBerlinCalendarDaysInclusive(startBounds.start, endBounds.end);
  const wish = await db.vacationWish.create({
    data: {
      companyId,
      userId,
      year,
      startDate: startBounds.start,
      endDate: endBounds.end,
      days,
      note: data.note?.trim() || null,
      status: VacationWishStatus.WISH,
    },
  });

  revalidatePath("/dashboard/vacation");
  return wish;
}

export async function deleteVacationWish(wishId: string) {
  const { userId, companyId, role } = await requireTenant();
  const wish = await db.vacationWish.findFirst({
    where: tenantWhere(companyId, { id: wishId }),
  });
  if (!wish) throw new Error("Wunsch nicht gefunden.");
  const isManager = ["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role);
  if (!isManager && wish.userId !== userId) throw new Error("Keine Berechtigung.");
  if (wish.status === VacationWishStatus.APPROVED) {
    throw new Error("Genehmigte Wünsche können nicht gelöscht werden.");
  }

  await db.vacationWish.delete({ where: { id: wishId } });
  revalidatePath("/dashboard/vacation");
}

export async function submitMyVacationWishes(year: number) {
  const { userId, companyId } = await requireTenant();
  const planYear = await ensurePlanYear(companyId, year);
  if (!planYear.submissionsOpen) {
    throw new Error("Abgabe ist geschlossen — sprich mit deiner Leitung.");
  }

  const result = await db.vacationWish.updateMany({
    where: tenantWhere(companyId, {
      userId,
      year,
      status: VacationWishStatus.WISH,
    }),
    data: {
      status: VacationWishStatus.SUBMITTED,
      submittedAt: new Date(),
    },
  });

  if (result.count === 0) {
    throw new Error("Keine offenen Wünsche zum Abgeben — zuerst Zeiträume eintragen.");
  }

  revalidatePath("/dashboard/vacation");
  return result.count;
}

export async function approveVacationWish(wishId: string) {
  const { userId, companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const wish = await db.vacationWish.findFirst({
    where: tenantWhere(companyId, { id: wishId }),
    include: { user: { select: { name: true, email: true } } },
  });
  if (!wish) throw new Error("Wunsch nicht gefunden.");
  if (wish.status === VacationWishStatus.APPROVED) {
    throw new Error("Bereits genehmigt.");
  }
  if (wish.status === VacationWishStatus.REJECTED) {
    throw new Error("Abgelehnter Wunsch — Mitarbeiter muss neu eintragen.");
  }

  const request = await db.vacationRequest.create({
    data: {
      companyId,
      userId: wish.userId,
      absenceType: AbsenceType.VACATION,
      startDate: wish.startDate,
      endDate: wish.endDate,
      days: wish.days,
      reason: wish.note,
      status: VacationStatus.APPROVED,
      approvedById: userId,
      approvedAt: new Date(),
      decisionNote: "Aus Urlaubsplan übernommen",
    },
  });

  await db.absence.create({
    data: {
      userId: wish.userId,
      orgId: companyId,
      type: AbsenceType.VACATION,
      start: wish.startDate,
      end: wish.endDate,
      status: AbsenceRequestStatus.APPROVED,
      reason: wish.note,
      sourceVacationRequestId: request.id,
      reviewedById: userId,
      reviewedAt: new Date(),
    },
  });

  await removeShiftsForApprovedAbsenceRange({
    companyId,
    userId: wish.userId,
    startDate: wish.startDate,
    endDate: wish.endDate,
  });

  await db.vacationWish.update({
    where: { id: wishId },
    data: {
      status: VacationWishStatus.APPROVED,
      reviewedById: userId,
      reviewedAt: new Date(),
      vacationRequestId: request.id,
    },
  });

  await createNotification({
    companyId,
    userId: wish.userId,
    type: "VACATION_APPROVED",
    title: "Urlaubswunsch genehmigt",
    body: `${formatBerlinDate(wish.startDate)}–${formatBerlinDate(wish.endDate)} (${wish.days} Tage)`,
    href: "/dashboard/vacation",
  });

  revalidatePath("/dashboard/vacation");
  revalidatePath("/dashboard/planning");
  return request;
}

export async function rejectVacationWish(wishId: string, note?: string) {
  const { userId, companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const wish = await db.vacationWish.findFirst({
    where: tenantWhere(companyId, { id: wishId }),
  });
  if (!wish) throw new Error("Wunsch nicht gefunden.");

  await db.vacationWish.update({
    where: { id: wishId },
    data: {
      status: VacationWishStatus.REJECTED,
      reviewedById: userId,
      reviewedAt: new Date(),
      note: note?.trim() ? `${wish.note ?? ""}\n[Ablehnung] ${note.trim()}`.trim() : wish.note,
    },
  });

  revalidatePath("/dashboard/vacation");
}

export async function setVacationPlanSubmissionsOpen(year: number, open: boolean) {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  await db.vacationPlanYear.upsert({
    where: { companyId_year: { companyId, year } },
    create: { companyId, year, submissionsOpen: open },
    update: { submissionsOpen: open },
  });

  revalidatePath("/dashboard/vacation");
}

export async function exportVacationPlanCsv(year: number): Promise<string> {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const wishes = await db.vacationWish.findMany({
    where: tenantWhere(companyId, { year }),
    orderBy: [{ user: { name: "asc" } }, { startDate: "asc" }],
    include: { user: { select: { name: true, email: true, vacationDays: true } } },
  });

  const header = "Name;E-Mail;Jahr;Von;Bis;Tage;Status;Notiz;Abgegeben am";
  const lines = wishes.map((w) => {
    const name = (w.user.name ?? "").replace(/;/g, ",");
    const email = w.user.email.replace(/;/g, ",");
    const note = (w.note ?? "").replace(/;/g, ",").replace(/\n/g, " ");
    const submitted = w.submittedAt
      ? formatBerlinDate(w.submittedAt)
      : "";
    return [
      name,
      email,
      String(w.year),
      formatBerlinDate(w.startDate),
      formatBerlinDate(w.endDate),
      String(w.days),
      w.status,
      note,
      submitted,
    ].join(";");
  });

  return `\uFEFF${header}\n${lines.join("\n")}`;
}
