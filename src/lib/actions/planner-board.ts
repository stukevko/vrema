"use server";

import { db } from "@/lib/db";
import { calculateSaldoForUser } from "@/lib/time/saldo-for-user";
import { requireTenant, requireTenantAction, tenantWhere } from "@/lib/tenant-guard";
import { revalidatePath } from "next/cache";
import { dateForPlannerCycleDay } from "@/lib/planning/cycle-display-date";
import {
  saldoSnapshotFromRaw,
  suggestOvertimeRecoveryDays,
  type MemberSaldoSnapshot,
  type OvertimeRecoveryDay,
} from "@/lib/planning/board-assistant";
import { computeStaffingRecommendationsForWeek } from "@/lib/predictive/compute-staffing-week";
import { cycleWeekStartIso } from "@/lib/planning/cycle-week-start";
import { getPlannerStaffingHints } from "@/lib/actions/predictive";
import { AbsenceRequestStatus, AbsenceType } from "@prisma/client";

export type { MemberSaldoSnapshot, OvertimeRecoveryDay };

export async function getPlannerBoardMemberSaldos(
  userIds: string[],
): Promise<Record<string, MemberSaldoSnapshot>> {
  const tenant = await requireTenantAction();
  if (!tenant.ok) return {};
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(tenant.role ?? "")) {
    return {};
  }
  const { companyId } = tenant;

  const unique = [...new Set(userIds.filter(Boolean))];
  const entries = await Promise.all(
    unique.map(async (userId) => {
      try {
        const raw = await calculateSaldoForUser(companyId, userId);
        return [userId, saldoSnapshotFromRaw(userId, raw)] as const;
      } catch {
        return [userId, saldoSnapshotFromRaw(userId, { workedMinutes: 0, expectedMinutes: 0, saldoMinutes: 0 })] as const;
      }
    }),
  );

  return Object.fromEntries(entries);
}

export async function getOvertimeRecoveryRecommendation(
  userId: string,
  weekIndex: number,
): Promise<{
  memberName: string;
  saldo: MemberSaldoSnapshot;
  suggestedDays: OvertimeRecoveryDay[];
}> {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const wk = Math.min(3, Math.max(1, Math.floor(weekIndex))) as 1 | 2 | 3;

  const user = await db.user.findFirst({
    where: tenantWhere(companyId, { id: userId }),
    select: { name: true, email: true },
  });
  if (!user) throw new Error("Mitarbeiter nicht gefunden.");

  const [rawSaldo, shifts, hints, staffingDays] = await Promise.all([
    calculateSaldoForUser(companyId, userId),
    db.shift.findMany({
      where: tenantWhere(companyId, { userId, weekIndex: wk }),
      select: {
        id: true,
        userId: true,
        weekIndex: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
      },
    }),
    getPlannerStaffingHints(wk),
    computeStaffingRecommendationsForWeek(companyId, cycleWeekStartIso(wk), { weekIndex: wk }),
  ]);

  const saldo = saldoSnapshotFromRaw(userId, rawSaldo);
  const suggestedDays = suggestOvertimeRecoveryDays({
    weekIndex: wk,
    userId,
    shifts,
    staffingHints: hints,
    staffingDays,
  });

  return {
    memberName: user.name ?? user.email,
    saldo,
    suggestedDays,
  };
}

/** Freizeitausgleich: Abwesenheit eintragen + Schichten der Tage löschen. */
export async function applyOvertimeRecovery(input: {
  userId: string;
  weekIndex: number;
  dayOfWeeks: number[];
}) {
  const { companyId, role, userId: reviewerId } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const wk = Math.min(3, Math.max(1, Math.floor(input.weekIndex))) as 1 | 2 | 3;
  const days = [...new Set(input.dayOfWeeks.filter((d) => d >= 0 && d <= 6))];
  if (days.length === 0) {
    throw new Error("Bitte mindestens einen Tag wählen.");
  }

  const member = await db.user.findFirst({
    where: tenantWhere(companyId, { id: input.userId }),
    select: { id: true },
  });
  if (!member) throw new Error("Mitarbeiter nicht gefunden.");

  for (const dayOfWeek of days) {
    const dayDate = dateForPlannerCycleDay(wk, dayOfWeek);
    const start = new Date(dayDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dayDate);
    end.setHours(23, 59, 59, 999);

    await db.absence.create({
      data: {
        userId: input.userId,
        orgId: companyId,
        type: AbsenceType.OTHER,
        start,
        end,
        status: AbsenceRequestStatus.APPROVED,
        reason: "Überstunden-Abbau (Freizeitausgleich)",
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });

    await db.shift.deleteMany({
      where: tenantWhere(companyId, {
        userId: input.userId,
        weekIndex: wk,
        dayOfWeek,
      }),
    });
  }

  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard/team/absences");
  revalidatePath("/dashboard/vacation");
  revalidatePath("/dashboard");

  return { daysApplied: days.length };
}
