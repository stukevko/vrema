"use server";

import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/email/transactional";
import { getWeekCycleIndex, normalizeCycleWeeks } from "@/lib/shift-cycle";
import { randomBytes } from "crypto";
import { ShiftTradeStatus } from "@prisma/client";
import { evaluateShiftTradeProposal } from "@/lib/planning/intelligence";
import type { TradeApprovalIntel } from "@/lib/planning/intelligence";

const MINUTES_PER_DAY = 24 * 60;
const DAYS_PER_WEEK = 7;
const MINUTES_PER_WEEK = MINUTES_PER_DAY * DAYS_PER_WEEK;

function parseTimeToMinutes(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  if (m < 0 || m > 59) return null;
  if (h < 0) return null;
  /** Tagesende im Planer (Timeline bis 24:00) – vorher schlug assertNoShiftOverlap fehl und konnte Folgefehler erzeugen. */
  if (h === 24 && m === 0) return 24 * 60;
  if (h > 23) return null;
  return h * 60 + m;
}

function shiftToInterval(dayOfWeek: number, startTime: string, endTime: string) {
  const startMinute = parseTimeToMinutes(startTime);
  const endMinute = parseTimeToMinutes(endTime);
  if (startMinute === null || endMinute === null) return null;
  if (startMinute === endMinute) return null;
  const absoluteStart = dayOfWeek * MINUTES_PER_DAY + startMinute;
  const absoluteEnd =
    dayOfWeek * MINUTES_PER_DAY + (endMinute <= startMinute ? endMinute + MINUTES_PER_DAY : endMinute);
  return { start: absoluteStart, end: absoluteEnd };
}

function intervalsOverlap(a: { start: number; end: number }, b: { start: number; end: number }) {
  return a.start < b.end && b.start < a.end;
}

export async function assertNoShiftOverlap(input: {
  companyId: string;
  userId: string;
  weekIndex: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  ignoredShiftId?: string;
  ignoreSameDay?: boolean;
}) {
  const candidate = shiftToInterval(input.dayOfWeek, input.startTime, input.endTime);
  if (!candidate) {
    throw new Error("Ungültige Schichtzeit. Start und Ende dürfen nicht identisch sein.");
  }
  const existing = await db.shift.findMany({
    where: {
      ...tenantWhere(input.companyId, {
        userId: input.userId,
        weekIndex: input.weekIndex,
      }),
      ...(input.ignoreSameDay ? { dayOfWeek: { not: input.dayOfWeek } } : {}),
      ...(input.ignoredShiftId ? { id: { not: input.ignoredShiftId } } : {}),
    },
    select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
  });

  for (const row of existing) {
    const interval = shiftToInterval(row.dayOfWeek, row.startTime, row.endTime);
    if (!interval) continue;
    const variants = [
      interval,
      { start: interval.start + MINUTES_PER_WEEK, end: interval.end + MINUTES_PER_WEEK },
      { start: interval.start - MINUTES_PER_WEEK, end: interval.end - MINUTES_PER_WEEK },
    ];
    if (variants.some((v) => intervalsOverlap(candidate, v))) {
      throw new Error("Schicht überschneidet sich mit einer bestehenden Schicht dieses Mitarbeiters.");
    }
  }
}

export async function inviteEmployeeForCompany(
  companyId: string,
  data: {
    name: string;
    email: string;
    role?: "EMPLOYEE" | "MANAGER";
    weeklyHours?: number;
  }
) {
  const existing = await db.user.findUnique({ where: { email: data.email.toLowerCase().trim() } });
  if (existing) throw new Error("Diese E-Mail ist bereits registriert.");

  // Generate a temporary password the employee must change on first login
  const tempPassword = Math.random().toString(36).slice(2, 10) + "Aa1!";
  const hashedPassword = await bcrypt.hash(tempPassword, 12);
  const terminalPin = Math.floor(1000 + Math.random() * 9000).toString();
  const terminalPinHash = await bcrypt.hash(terminalPin, 12);

  const user = await db.user.create({
    data: {
      companyId,
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      password: hashedPassword,
      emailVerified: new Date(),
      terminalPin,
      terminalPinHash,
      role: data.role ?? "EMPLOYEE",
      weeklyHours: data.weeklyHours ?? 40,
    },
    select: { id: true, name: true, email: true },
  });

  // Fire-and-forget welcome email (non-fatal if Resend is not configured)
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  });

  await sendWelcomeEmail({
    recipientName: user.name ?? data.name.trim(),
    recipientEmail: user.email,
    companyName: company?.name ?? "deiner Firma",
    tempPassword,
  });

  return { user, tempPassword, terminalPin };
}

export async function getTeamMembers() {
  const { companyId } = await requireTenant();

  return db.user.findMany({
    where: tenantWhere(companyId),
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      isActive: true,
      weeklyHours: true,
      vacationDays: true,
      employeeNumber: true,
      hourlyWage: true,
      planningWorkArea: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

export async function updateEmployeePlanningWorkArea(userId: string, raw: string) {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }
  const v = raw.trim().toUpperCase();
  const normalized = v === "OUTDOOR" || v === "TERRACE" ? v : null;
  const member = await db.user.findFirst({
    where: tenantWhere(companyId, { id: userId }),
    select: { id: true },
  });
  if (!member) throw new Error("Mitarbeiter nicht gefunden.");

  await db.user.update({
    where: { id: userId },
    data: { planningWorkArea: normalized },
  });
  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/planning");
}

export async function inviteEmployee(data: {
  name: string;
  email: string;
  role?: "EMPLOYEE" | "MANAGER";
  weeklyHours?: number;
}) {
  const { companyId, role } = await requireTenant();

  if (role !== "COMPANY_OWNER" && role !== "MANAGER" && role !== "SUPER_ADMIN") {
    throw new Error("Keine Berechtigung zum Einladen.");
  }

  const result = await inviteEmployeeForCompany(companyId, data);
  revalidatePath("/dashboard/team");
  return result;
}

export async function toggleEmployeeActive(userId: string) {
  const { companyId, role } = await requireTenant();

  if (role !== "COMPANY_OWNER" && role !== "SUPER_ADMIN") {
    throw new Error("Keine Berechtigung.");
  }

  const user = await db.user.findFirst({ where: tenantWhere(companyId, { id: userId }) });
  if (!user) throw new Error("Mitarbeiter nicht gefunden.");

  await db.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
  });

  revalidatePath("/dashboard/team");
}

export async function updateEmployeeNumber(userId: string, employeeNumberRaw: string) {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }
  const employeeNumber = employeeNumberRaw.trim();
  const member = await db.user.findFirst({
    where: tenantWhere(companyId, { id: userId }),
    select: { id: true },
  });
  if (!member) throw new Error("Mitarbeiter nicht gefunden.");

  if (employeeNumber.length > 0) {
    const duplicate = await db.user.findFirst({
      where: tenantWhere(companyId, {
        employeeNumber,
        id: { not: userId },
      }),
      select: { id: true },
    });
    if (duplicate) {
      throw new Error("Diese Personalnummer ist im Unternehmen bereits vergeben.");
    }
  }

  await db.user.update({
    where: { id: userId },
    data: { employeeNumber: employeeNumber.length > 0 ? employeeNumber : null },
  });

  revalidatePath("/dashboard/team");
}

export async function updateEmployeeHourlyWage(userId: string, hourlyWageRaw: string) {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }
  const trimmed = hourlyWageRaw.trim().replace(",", ".");
  const member = await db.user.findFirst({
    where: tenantWhere(companyId, { id: userId }),
    select: { id: true },
  });
  if (!member) throw new Error("Mitarbeiter nicht gefunden.");

  let hourlyWage: number | null = null;
  if (trimmed.length > 0) {
    const n = Number.parseFloat(trimmed);
    if (!Number.isFinite(n) || n < 0) {
      throw new Error("Ungültiger Stundenlohn.");
    }
    hourlyWage = Math.round(n * 100) / 100;
  }

  await db.user.update({
    where: { id: userId },
    data: { hourlyWage },
  });

  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/planning");
}

export async function getShifts() {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) return [];

  return db.shift.findMany({
    where: tenantWhere(companyId),
    select: {
      id: true,
      userId: true,
      weekIndex: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      breakDuration: true,
      isDraft: true,
      staffingRole: true,
      isOpenForTrade: true,
      tradeStatus: true,
      tradeRequestedBy: true,
    },
    orderBy: [{ userId: "asc" }, { weekIndex: "asc" }, { dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

export async function upsertShift(input: {
  userId: string;
  weekIndex?: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}) {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const weekIndex = Math.min(3, Math.max(1, Math.floor(input.weekIndex ?? 1)));
  const startTime = input.startTime.trim();
  const endTime = input.endTime.trim();
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    throw new Error("Ungültiges Zeitformat. Erwartet HH:MM.");
  }
  await assertNoShiftOverlap({
    companyId,
    userId: input.userId,
    weekIndex,
    dayOfWeek: input.dayOfWeek,
    startTime,
    endTime,
    ignoreSameDay: true,
  });

  await db.shift.upsert({
    where: {
      companyId_userId_weekIndex_dayOfWeek_startTime: {
        companyId,
        userId: input.userId,
        weekIndex,
        dayOfWeek: input.dayOfWeek,
        startTime,
      },
    },
    update: { endTime },
    create: {
      companyId,
      userId: input.userId,
      dayOfWeek: input.dayOfWeek,
      startTime,
      endTime,
    },
  });

  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/planning");
}

export async function deleteShift(shiftId: string) {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const existing = await db.shift.findFirst({
    where: tenantWhere(companyId, { id: shiftId }),
    select: { id: true },
  });
  if (!existing) throw new Error("Schicht nicht gefunden.");

  await db.shift.delete({ where: { id: shiftId } });
  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/planning");
}

export async function applyStandardWeek(input: {
  userId: string;
  weekIndex?: number;
  startTime: string;
  endTime: string;
}) {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const weekIndex = Math.min(3, Math.max(1, Math.floor(input.weekIndex ?? 1)));
  const startTime = input.startTime.trim();
  const endTime = input.endTime.trim();
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    throw new Error("Ungültiges Zeitformat. Erwartet HH:MM.");
  }

  const weekdays = [1, 2, 3, 4, 5];
  for (const dayOfWeek of weekdays) {
    await assertNoShiftOverlap({
      companyId,
      userId: input.userId,
      weekIndex,
      dayOfWeek,
      startTime,
      endTime,
      ignoreSameDay: true,
    });
  }
  await db.$transaction(
    weekdays.map((dayOfWeek) =>
      db.shift.upsert({
        where: {
          companyId_userId_weekIndex_dayOfWeek_startTime: {
            companyId,
            userId: input.userId,
            weekIndex,
            dayOfWeek,
            startTime,
          },
        },
        update: { endTime },
        create: {
          companyId,
          userId: input.userId,
          weekIndex,
          dayOfWeek,
          startTime,
          endTime,
        },
      })
    )
  );

  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/planning");
}

export async function setShiftForDay(input: {
  userId: string;
  weekIndex?: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakDuration?: number;
}) {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const weekIndex = Math.min(3, Math.max(1, Math.floor(input.weekIndex ?? 1)));
  const startTime = input.startTime.trim();
  const endTime = input.endTime.trim();
  const breakDuration = Math.max(0, Math.min(180, Math.floor(input.breakDuration ?? 0)));
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    throw new Error("Ungültiges Zeitformat. Erwartet HH:MM.");
  }
  await assertNoShiftOverlap({
    companyId,
    userId: input.userId,
    weekIndex,
    dayOfWeek: input.dayOfWeek,
    startTime,
    endTime,
  });

  await db.$transaction([
    db.shift.deleteMany({
      where: tenantWhere(companyId, {
        userId: input.userId,
        weekIndex,
        dayOfWeek: input.dayOfWeek,
      }),
    }),
    db.shift.create({
      data: {
        companyId,
        userId: input.userId,
        weekIndex,
        dayOfWeek: input.dayOfWeek,
        startTime,
        endTime,
        breakDuration,
        isOpenForTrade: false,
        tradeStatus: ShiftTradeStatus.NONE,
        tradeRequestedBy: null,
      },
    }),
  ]);

  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/planning");
}

export async function clearShiftForDay(input: { userId: string; weekIndex?: number; dayOfWeek: number }) {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const weekIndex = Math.min(3, Math.max(1, Math.floor(input.weekIndex ?? 1)));
  await db.shift.deleteMany({
    where: tenantWhere(companyId, {
      userId: input.userId,
      weekIndex,
      dayOfWeek: input.dayOfWeek,
    }),
  });

  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/planning");
}

export async function getMyShifts() {
  const { companyId, userId } = await requireTenant();
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { shiftCycleWeeks: true },
  });
  const currentWeekIndex = getWeekCycleIndex(new Date(), company?.shiftCycleWeeks);
  return db.shift.findMany({
    where: tenantWhere(companyId, { userId, weekIndex: currentWeekIndex, isDraft: false }),
    select: {
      id: true,
      userId: true,
      weekIndex: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      breakDuration: true,
      isOpenForTrade: true,
      tradeStatus: true,
      tradeRequestedBy: true,
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

export async function toggleShiftTradeOffer(shiftId: string, makeOpen: boolean) {
  const { companyId, userId, role } = await requireTenant();
  if (!["EMPLOYEE", "MANAGER", "COMPANY_OWNER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }
  const shift = await db.shift.findFirst({
    where: tenantWhere(companyId, { id: shiftId, userId, isDraft: false }),
    select: { id: true, userId: true },
  });
  if (!shift) throw new Error("Schicht nicht gefunden.");
  await db.shift.update({
    where: { id: shift.id },
    data: makeOpen
      ? { isOpenForTrade: true, tradeStatus: ShiftTradeStatus.OPEN, tradeRequestedBy: null }
      : { isOpenForTrade: false, tradeStatus: ShiftTradeStatus.NONE, tradeRequestedBy: null },
  });
  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard");
}

export async function getOpenShiftTradesForMyRole() {
  const { companyId, userId } = await requireTenant();
  const me = await db.user.findFirst({
    where: tenantWhere(companyId, { id: userId }),
    select: { role: true, isActive: true },
  });
  if (!me || !me.isActive) return [];
  const trades = await db.shift.findMany({
    where: tenantWhere(companyId, {
      isDraft: false,
      isOpenForTrade: true,
      tradeStatus: ShiftTradeStatus.OPEN,
      userId: { not: userId },
      user: { role: me.role, isActive: true },
    }),
    include: {
      user: { select: { name: true, email: true, role: true } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    take: 40,
  });
  return trades.map((s) => ({
    id: s.id,
    userId: s.userId,
    ownerName: s.user.name ?? s.user.email,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    tradeStatus: s.tradeStatus,
    tradeRequestedBy: s.tradeRequestedBy,
  }));
}

export async function requestShiftTradeTakeover(shiftId: string) {
  const { companyId, userId } = await requireTenant();
  const me = await db.user.findFirst({
    where: tenantWhere(companyId, { id: userId }),
    select: { role: true, isActive: true },
  });
  if (!me || !me.isActive) throw new Error("Benutzer nicht aktiv.");

  const shift = await db.shift.findFirst({
    where: tenantWhere(companyId, { id: shiftId, isDraft: false }),
    include: { user: { select: { role: true, isActive: true } } },
  });
  if (!shift) throw new Error("Schicht nicht gefunden.");
  if (shift.userId === userId) throw new Error("Eigene Schicht kann nicht übernommen werden.");
  if (!shift.isOpenForTrade || shift.tradeStatus !== ShiftTradeStatus.OPEN) throw new Error("Schicht ist nicht offen für Tausch.");
  if (!shift.user.isActive || shift.user.role !== me.role) {
    throw new Error("Diese Schicht ist nur für Mitarbeitende derselben Rolle verfügbar.");
  }

  await db.shift.update({
    where: { id: shift.id },
    data: {
      tradeStatus: ShiftTradeStatus.PENDING_APPROVAL,
      tradeRequestedBy: userId,
      isOpenForTrade: true,
    },
  });
  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard");
}

export async function getPendingTradeApprovals(): Promise<
  Array<{
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    fromName: string;
    requestedByName: string;
    requestedById: string | null;
    userId: string;
    intel: TradeApprovalIntel | null;
  }>
> {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) return [];
  const rows = await db.shift.findMany({
    where: tenantWhere(companyId, { tradeStatus: ShiftTradeStatus.PENDING_APPROVAL, isDraft: false }),
    include: {
      user: { select: { name: true, email: true } },
      company: { select: { users: { select: { id: true, name: true, email: true } } } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  const base = rows.map((row) => {
    const requester = row.company.users.find((u) => u.id === row.tradeRequestedBy);
    return {
      id: row.id,
      dayOfWeek: row.dayOfWeek,
      startTime: row.startTime,
      endTime: row.endTime,
      fromName: row.user.name ?? row.user.email,
      requestedByName: requester?.name ?? requester?.email ?? "Unbekannt",
      requestedById: row.tradeRequestedBy,
      userId: row.userId,
    };
  });
  const intelList = await Promise.all(base.map((b) => evaluateShiftTradeProposal(companyId, b.id)));
  return base.map((b, i) => ({ ...b, intel: intelList[i] ?? null }));
}

export async function countPendingShiftTradeApprovals() {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) return 0;
  return db.shift.count({
    where: tenantWhere(companyId, { tradeStatus: ShiftTradeStatus.PENDING_APPROVAL, isDraft: false }),
  });
}

export async function decideShiftTradeApproval(shiftId: string, approve: boolean) {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }
  const shift = await db.shift.findFirst({
    where: tenantWhere(companyId, { id: shiftId, tradeStatus: ShiftTradeStatus.PENDING_APPROVAL, isDraft: false }),
    include: {
      user: { select: { role: true } },
      company: { select: { users: { select: { id: true, role: true, isActive: true } } } },
    },
  });
  if (!shift) throw new Error("Anfrage nicht gefunden.");
  if (!shift.tradeRequestedBy) throw new Error("Kein Übernehmer hinterlegt.");
  const requester = shift.company.users.find((u) => u.id === shift.tradeRequestedBy);
  if (!requester || !requester.isActive || requester.role !== shift.user.role) {
    throw new Error("Übernehmer ist nicht mehr berechtigt.");
  }

  if (!approve) {
    await db.shift.update({
      where: { id: shift.id },
      data: { tradeStatus: ShiftTradeStatus.OPEN, tradeRequestedBy: null, isOpenForTrade: true },
    });
  } else {
    const intel = await evaluateShiftTradeProposal(companyId, shift.id);
    if (!intel) {
      throw new Error("Automatische Prüfung fehlgeschlagen. Bitte später erneut versuchen.");
    }
    if (!intel.legalOk) {
      throw new Error(
        "Tausch nicht freigegeben: Ruhezeit oder Überschneidung für den Übernehmer. Bitte ablehnen oder Plan anpassen."
      );
    }
    await db.shift.update({
      where: { id: shift.id },
      data: {
        userId: shift.tradeRequestedBy,
        isOpenForTrade: false,
        tradeStatus: ShiftTradeStatus.NONE,
        tradeRequestedBy: null,
      },
    });
  }
  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard");
}

export async function copyWeekToAllMembers(sourceUserId: string) {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const sourceShifts = await db.shift.findMany({
    where: tenantWhere(companyId, { userId: sourceUserId, isDraft: false }),
    select: { weekIndex: true, dayOfWeek: true, startTime: true, endTime: true, breakDuration: true },
    orderBy: [{ weekIndex: "asc" }, { dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  if (sourceShifts.length === 0) {
    throw new Error("Ausgewählter Mitarbeiter hat keine Schichten zum Übertragen.");
  }

  const targets = await db.user.findMany({
    where: tenantWhere(companyId, { isActive: true, id: { not: sourceUserId } }),
    select: { id: true },
  });

  if (targets.length === 0) {
    throw new Error("Keine weiteren aktiven Mitarbeiter gefunden.");
  }

  // Bulk-Replace ohne N+1: ein deleteMany über alle Ziel-User, danach ein
  // createMany mit dem Kreuzprodukt (targets × sourceShifts).
  const targetIds = targets.map((t) => t.id);
  const bulkData = targetIds.flatMap((userId) =>
    sourceShifts.map((s) => ({
      companyId,
      userId,
      weekIndex: s.weekIndex,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      breakDuration: s.breakDuration,
    })),
  );

  await db.$transaction(async (tx) => {
    await tx.shift.deleteMany({
      where: { companyId, userId: { in: targetIds } },
    });
    if (bulkData.length > 0) {
      await tx.shift.createMany({ data: bulkData, skipDuplicates: true });
    }
  });

  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/planning");
  return { copiedTo: targets.length };
}

export async function setShiftBreakDuration(shiftId: string, breakDurationRaw: number) {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }
  const breakDuration = Math.max(0, Math.min(180, Math.floor(breakDurationRaw || 0)));
  const shift = await db.shift.findFirst({
    where: tenantWhere(companyId, { id: shiftId }),
    select: { id: true },
  });
  if (!shift) throw new Error("Schicht nicht gefunden.");
  await db.shift.update({
    where: { id: shiftId },
    data: { breakDuration },
  });
  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard/team");
}

export async function getShiftCycleWeeks() {
  const { companyId } = await requireTenant();
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { shiftCycleWeeks: true },
  });
  return normalizeCycleWeeks(company?.shiftCycleWeeks);
}

export async function createTeamInviteLink(role: "USER" | "MANAGER" = "USER") {
  const { companyId, role: actorRole } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(actorRole)) {
    throw new Error("Keine Berechtigung.");
  }

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  let code = "";
  for (let i = 0; i < 5; i += 1) {
    const part = randomBytes(5).toString("base64url").slice(0, 8).toLowerCase();
    const candidate = `${part.slice(0, 4)}-${part.slice(4)}`;
    const exists = await db.inviteLink.findUnique({ where: { code: candidate }, select: { id: true } });
    if (!exists) {
      code = candidate;
      break;
    }
  }
  if (!code) throw new Error("Einladungslink konnte nicht erstellt werden.");

  await db.inviteLink.create({
    data: {
      code,
      role,
      orgId: companyId,
      expiresAt,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "https://vrema.app";
  return {
    url: `${appUrl.replace(/\/$/, "")}/join/${code}`,
    code,
    expiresAt,
    role,
  };
}
