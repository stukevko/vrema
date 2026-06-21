"use server";

import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import { revalidatePath } from "next/cache";
import { ShiftTradeStatus } from "@prisma/client";
import { evaluateShiftTradeProposal } from "@/lib/planning/intelligence";
import {
  notifyManagersTradeRequest,
  notifyPeerShiftTradeRequest,
  notifyTradeDecision,
} from "@/lib/notifications/dispatch";

const DAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

function shiftLabel(dayOfWeek: number, startTime: string, endTime: string): string {
  const day = DAY_LABELS[dayOfWeek] ?? "Tag";
  return `${day} ${startTime.slice(0, 5)}–${endTime.slice(0, 5)}`;
}

/** Kolleg:innen derselben Rolle für Direktanfrage. */
export async function getShiftTradeColleagues() {
  const { companyId, userId } = await requireTenant();
  const me = await db.user.findFirst({
    where: tenantWhere(companyId, { id: userId, isActive: true }),
    select: { role: true },
  });
  if (!me) return [];

  const rows = await db.user.findMany({
    where: tenantWhere(companyId, {
      isActive: true,
      id: { not: userId },
      role: me.role,
    }),
    select: { id: true, name: true, email: true, image: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });

  return rows.map((u) => ({
    id: u.id,
    name: (u.name ?? u.email).trim(),
    email: u.email,
    image: u.image != null ? String(u.image) : null,
  }));
}

/** Eingehende TPA-Anfragen für mich. */
export async function getIncomingShiftTradeRequests() {
  const { companyId, userId } = await requireTenant();

  const rows = await db.shift.findMany({
    where: tenantWhere(companyId, {
      isDraft: false,
      tradeStatus: ShiftTradeStatus.PEER_PENDING,
      tradeTargetUserId: userId,
    }),
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    take: 20,
  });

  const counterIds = rows.map((r) => r.tradeCounterShiftId).filter((id): id is string => Boolean(id));
  const counters =
    counterIds.length > 0
      ? await db.shift.findMany({
          where: tenantWhere(companyId, { id: { in: counterIds } }),
          select: { id: true, dayOfWeek: true, startTime: true, endTime: true, weekIndex: true },
        })
      : [];
  const counterById = new Map(counters.map((c) => [c.id, c]));

  return rows.map((s) => {
    const counter = s.tradeCounterShiftId ? counterById.get(s.tradeCounterShiftId) : null;
    return {
      id: s.id,
      fromName: (s.user.name ?? s.user.email).trim(),
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      weekIndex: s.weekIndex,
      slotLabel: shiftLabel(s.dayOfWeek, s.startTime, s.endTime),
      isSwap: Boolean(counter),
      counterSlotLabel: counter
        ? shiftLabel(counter.dayOfWeek, counter.startTime, counter.endTime)
        : null,
    };
  });
}

/** Schichten einer Kolleg:in (für echten Tausch). */
export async function getColleagueShiftsForSwap(colleagueUserId: string) {
  const { companyId, userId } = await requireTenant();
  const me = await db.user.findFirst({
    where: tenantWhere(companyId, { id: userId, isActive: true }),
    select: { role: true },
  });
  if (!me) return [];

  const colleague = await db.user.findFirst({
    where: tenantWhere(companyId, { id: colleagueUserId, isActive: true, role: me.role }),
    select: { id: true },
  });
  if (!colleague) return [];

  const rows = await db.shift.findMany({
    where: tenantWhere(companyId, {
      userId: colleagueUserId,
      isDraft: false,
      tradeStatus: ShiftTradeStatus.NONE,
    }),
    select: {
      id: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      weekIndex: true,
    },
    orderBy: [{ weekIndex: "asc" }, { dayOfWeek: "asc" }, { startTime: "asc" }],
    take: 40,
  });

  return rows.map((s) => ({
    id: s.id,
    weekIndex: s.weekIndex,
    slotLabel: shiftLabel(s.dayOfWeek, s.startTime, s.endTime),
  }));
}

/** TPA: Anfrage an eine bestimmte Person senden. */
export async function requestShiftTradeToColleague(input: {
  shiftId: string;
  targetUserId: string;
  counterShiftId?: string | null;
}) {
  const { companyId, userId } = await requireTenant();
  const me = await db.user.findFirst({
    where: tenantWhere(companyId, { id: userId, isActive: true }),
    select: { name: true, email: true, role: true },
  });
  if (!me) throw new Error("Benutzer nicht aktiv.");

  const shift = await db.shift.findFirst({
    where: tenantWhere(companyId, { id: input.shiftId, userId, isDraft: false }),
  });
  if (!shift) throw new Error("Schicht nicht gefunden.");
  if (shift.tradeStatus !== ShiftTradeStatus.NONE) {
    throw new Error("Für diese Schicht läuft bereits eine Anfrage.");
  }

  const target = await db.user.findFirst({
    where: tenantWhere(companyId, { id: input.targetUserId, isActive: true, role: me.role }),
    select: { id: true, name: true, email: true },
  });
  if (!target) throw new Error("Kolleg:in nicht gefunden oder andere Rolle.");

  let counterShiftId: string | null = null;
  if (input.counterShiftId) {
    const counter = await db.shift.findFirst({
      where: tenantWhere(companyId, {
        id: input.counterShiftId,
        userId: target.id,
        isDraft: false,
        tradeStatus: ShiftTradeStatus.NONE,
      }),
    });
    if (!counter) throw new Error("Gegen-Schicht nicht gefunden.");
    counterShiftId = counter.id;
  }

  await db.shift.update({
    where: { id: shift.id },
    data: {
      tradeStatus: ShiftTradeStatus.PEER_PENDING,
      tradeTargetUserId: target.id,
      tradeCounterShiftId: counterShiftId,
      tradeRequestedBy: null,
      isOpenForTrade: false,
    },
  });

  await notifyPeerShiftTradeRequest({
    companyId,
    targetUserId: target.id,
    fromName: me.name ?? me.email,
    dayOfWeek: shift.dayOfWeek,
    startTime: shift.startTime,
    endTime: shift.endTime,
    isSwap: Boolean(counterShiftId),
  });

  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard");
}

/** TPA: Kolleg:in nimmt an oder lehnt ab. */
export async function respondShiftTradePeerRequest(shiftId: string, accept: boolean) {
  const { companyId, userId } = await requireTenant();

  const shift = await db.shift.findFirst({
    where: tenantWhere(companyId, {
      id: shiftId,
      isDraft: false,
      tradeStatus: ShiftTradeStatus.PEER_PENDING,
      tradeTargetUserId: userId,
    }),
    include: { user: { select: { name: true, email: true } } },
  });
  if (!shift) throw new Error("Anfrage nicht gefunden oder abgelaufen.");

  if (!accept) {
    await db.shift.update({
      where: { id: shift.id },
      data: {
        tradeStatus: ShiftTradeStatus.NONE,
        tradeTargetUserId: null,
        tradeCounterShiftId: null,
        tradeRequestedBy: null,
        isOpenForTrade: false,
      },
    });
    revalidatePath("/dashboard/planning");
    return;
  }

  const me = await db.user.findFirst({
    where: tenantWhere(companyId, { id: userId }),
    select: { name: true, email: true },
  });

  await db.shift.update({
    where: { id: shift.id },
    data: {
      tradeStatus: ShiftTradeStatus.PENDING_APPROVAL,
      tradeRequestedBy: userId,
      tradeTargetUserId: null,
      isOpenForTrade: false,
    },
  });

  await notifyManagersTradeRequest({
    companyId,
    requesterName: me?.name ?? me?.email ?? "Mitarbeiter",
    ownerName: shift.user.name ?? shift.user.email,
    dayOfWeek: shift.dayOfWeek,
    startTime: shift.startTime,
    endTime: shift.endTime,
  });

  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard");
}

/** Anfrage zurückziehen (Absender). */
export async function cancelShiftTradePeerRequest(shiftId: string) {
  const { companyId, userId } = await requireTenant();

  const shift = await db.shift.findFirst({
    where: tenantWhere(companyId, {
      id: shiftId,
      userId,
      isDraft: false,
      tradeStatus: ShiftTradeStatus.PEER_PENDING,
    }),
  });
  if (!shift) throw new Error("Keine offene Anfrage.");

  await db.shift.update({
    where: { id: shift.id },
    data: {
      tradeStatus: ShiftTradeStatus.NONE,
      tradeTargetUserId: null,
      tradeCounterShiftId: null,
      tradeRequestedBy: null,
      isOpenForTrade: false,
    },
  });

  revalidatePath("/dashboard/planning");
}

/** Manager-Freigabe inkl. echtem Tausch (zwei Schichten). */
export async function finalizeShiftTradeApproval(shiftId: string, approve: boolean) {
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

  const resetTrade = {
    tradeStatus: ShiftTradeStatus.NONE,
    tradeRequestedBy: null,
    tradeTargetUserId: null,
    tradeCounterShiftId: null,
    isOpenForTrade: false,
  } as const;

  if (!approve) {
    await db.shift.update({ where: { id: shift.id }, data: resetTrade });
    await notifyTradeDecision({
      companyId,
      userId: shift.tradeRequestedBy,
      approved: false,
      dayOfWeek: shift.dayOfWeek,
      startTime: shift.startTime,
      endTime: shift.endTime,
    });
    revalidatePath("/dashboard/planning");
    revalidatePath("/dashboard");
    return;
  }

  const intel = await evaluateShiftTradeProposal(companyId, shift.id);
  if (!intel?.legalOk) {
    throw new Error(
      "Tausch nicht freigegeben: Ruhezeit oder Überschneidung. Bitte ablehnen oder Plan anpassen.",
    );
  }

  const newOwnerId = shift.tradeRequestedBy;
  const originalOwnerId = shift.userId;

  if (shift.tradeCounterShiftId) {
    const counter = await db.shift.findFirst({
      where: tenantWhere(companyId, { id: shift.tradeCounterShiftId, isDraft: false }),
    });
    if (!counter || counter.userId !== newOwnerId) {
      throw new Error("Gegen-Schicht für Tausch nicht mehr gültig.");
    }
    await db.$transaction([
      db.shift.update({
        where: { id: shift.id },
        data: { userId: newOwnerId, ...resetTrade },
      }),
      db.shift.update({
        where: { id: counter.id },
        data: { userId: originalOwnerId, ...resetTrade },
      }),
    ]);
  } else {
    await db.shift.update({
      where: { id: shift.id },
      data: { userId: newOwnerId, ...resetTrade },
    });
  }

  await notifyTradeDecision({
    companyId,
    userId: newOwnerId,
    approved: true,
    dayOfWeek: shift.dayOfWeek,
    startTime: shift.startTime,
    endTime: shift.endTime,
  });

  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard");
}
