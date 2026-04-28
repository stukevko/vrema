"use server";

import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/actions/emails";
import { getWeekCycleIndex, normalizeCycleWeeks } from "@/lib/shift-cycle";

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
      role: true,
      isActive: true,
      weeklyHours: true,
      vacationDays: true,
      employeeNumber: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
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

  await db.$transaction([
    db.shift.deleteMany({
      where: tenantWhere(companyId, {
        userId: input.userId,
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
    where: tenantWhere(companyId, { userId, weekIndex: currentWeekIndex }),
    select: {
      id: true,
      weekIndex: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

export async function copyWeekToAllMembers(sourceUserId: string) {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const sourceShifts = await db.shift.findMany({
    where: tenantWhere(companyId, { userId: sourceUserId }),
    select: { weekIndex: true, dayOfWeek: true, startTime: true, endTime: true },
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

  await db.$transaction(async (tx) => {
    for (const target of targets) {
      await tx.shift.deleteMany({
        where: {
          companyId,
          userId: target.id,
        },
      });
      if (sourceShifts.length > 0) {
        await tx.shift.createMany({
          data: sourceShifts.map((s) => ({
            companyId,
            userId: target.id,
            weekIndex: s.weekIndex,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        });
      }
    }
  });

  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/planning");
  return { copiedTo: targets.length };
}

export async function getShiftCycleWeeks() {
  const { companyId } = await requireTenant();
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { shiftCycleWeeks: true },
  });
  return normalizeCycleWeeks(company?.shiftCycleWeeks);
}
