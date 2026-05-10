"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import type { NotificationType } from "@prisma/client";

const PAGE_SIZE = 20;

export type NotificationDTO = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function listMyNotifications(): Promise<NotificationDTO[]> {
  const { userId, companyId } = await requireTenant();
  const rows = await db.notification.findMany({
    where: tenantWhere(companyId, { userId }),
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      href: true,
      readAt: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    href: r.href,
    readAt: r.readAt ? r.readAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function countMyUnreadNotifications(): Promise<number> {
  const { userId, companyId } = await requireTenant();
  return db.notification.count({
    where: tenantWhere(companyId, { userId, readAt: null }),
  });
}

export async function markNotificationRead(notificationId: string) {
  const { userId, companyId } = await requireTenant();
  if (!notificationId?.trim()) throw new Error("Notification fehlt.");
  await db.notification.updateMany({
    where: tenantWhere(companyId, { id: notificationId.trim(), userId, readAt: null }),
    data: { readAt: new Date() },
  });
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function markAllNotificationsRead() {
  const { userId, companyId } = await requireTenant();
  await db.notification.updateMany({
    where: tenantWhere(companyId, { userId, readAt: null }),
    data: { readAt: new Date() },
  });
  revalidatePath("/dashboard");
  return { ok: true as const };
}
