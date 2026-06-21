import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import type { NotificationType, UserRole } from "@prisma/client";
import { sendPushToUsers } from "@/lib/push/send";
import { vocabularyLabels, type VocabularyLabels } from "@/lib/vocabulary";

async function labelsForCompany(companyId: string): Promise<VocabularyLabels> {
  const row = await db.company.findUnique({
    where: { id: companyId },
    select: { shiftVocabulary: true },
  });
  return vocabularyLabels(row?.shiftVocabulary);
}

const DAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function shiftTimeLabel(dayOfWeek: number, startTime: string, endTime: string): string {
  const day = DAY_LABELS[dayOfWeek] ?? "?";
  return `${day} ${startTime.slice(0, 5)}–${endTime.slice(0, 5)}`;
}

export async function createNotifications(
  companyId: string,
  userIds: string[],
  payload: {
    type: NotificationType;
    title: string;
    body?: string;
    href?: string;
  },
): Promise<void> {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return;
  await db.notification.createMany({
    data: unique.map((userId) => ({
      companyId,
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body ?? null,
      href: payload.href ?? null,
    })),
  });
  void sendPushToUsers(unique, {
    title: payload.title,
    body: payload.body,
    url: payload.href,
  });
}

/** Team (gleiche Rolle) informieren, dass eine Schicht zur Übernahme offen ist. */
export async function notifyOpenShiftPublished(params: {
  companyId: string;
  excludeUserId: string;
  sameRole: UserRole;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}): Promise<void> {
  const peers = await db.user.findMany({
    where: tenantWhere(params.companyId, {
      isActive: true,
      role: params.sameRole,
      id: { not: params.excludeUserId },
    }),
    select: { id: true },
  });
  const [when, vocab] = await Promise.all([
    Promise.resolve(shiftTimeLabel(params.dayOfWeek, params.startTime, params.endTime)),
    labelsForCompany(params.companyId),
  ]);
  await createNotifications(
    params.companyId,
    peers.map((p) => p.id),
    {
      type: "GENERIC",
      title: `Offener ${vocab.singular}`,
      body: `${when} — im Planer übernehmen.`,
      href: "/dashboard/planning",
    },
  );
}

/** Kolleg:in über Direktanfrage informieren (TPA). */
export async function notifyPeerShiftTradeRequest(params: {
  companyId: string;
  targetUserId: string;
  fromName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isSwap: boolean;
}): Promise<void> {
  const when = shiftTimeLabel(params.dayOfWeek, params.startTime, params.endTime);
  await createNotifications(params.companyId, [params.targetUserId], {
    type: "GENERIC",
    title: params.isSwap ? "Tauschanfrage" : "Schicht-Anfrage",
    body: `${params.fromName} möchte ${when} ${params.isSwap ? "mit dir tauschen" : "an dich übergeben"}.`,
    href: "/dashboard/planning",
  });
}

/** Führungskräfte über neue Übernahme-Anfrage informieren. */
export async function notifyManagersTradeRequest(params: {
  companyId: string;
  requesterName: string;
  ownerName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}): Promise<void> {
  const managers = await db.user.findMany({
    where: tenantWhere(params.companyId, {
      isActive: true,
      role: { in: ["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"] as UserRole[] },
    }),
    select: { id: true },
  });
  const when = shiftTimeLabel(params.dayOfWeek, params.startTime, params.endTime);
  await createNotifications(
    params.companyId,
    managers.map((m) => m.id),
    {
      type: "GENERIC",
      title: "Übernahme prüfen",
      body: `${params.requesterName} möchte ${when} von ${params.ownerName} übernehmen.`,
      href: "/dashboard/planning#shift-trade-approvals",
    },
  );
}

export async function notifyTradeDecision(params: {
  companyId: string;
  userId: string;
  approved: boolean;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}): Promise<void> {
  const [when, vocab] = await Promise.all([
    Promise.resolve(shiftTimeLabel(params.dayOfWeek, params.startTime, params.endTime)),
    labelsForCompany(params.companyId),
  ]);
  await createNotifications(params.companyId, [params.userId], {
    type: params.approved ? "SHIFT_TRADE_APPROVED" : "SHIFT_TRADE_REJECTED",
    title: params.approved ? "Übernahme bestätigt" : "Übernahme abgelehnt",
    body: params.approved
      ? `Deine Übernahme für ${when} ist freigegeben.`
      : `Die Übernahme für ${when} wurde abgelehnt — ${vocab.singular} bleibt offen oder beim Kollegen.`,
    href: "/dashboard/planning",
  });
}
