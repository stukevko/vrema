import { db } from "@/lib/db";
import type { NotificationType } from "@prisma/client";

/**
 * Server-only Helper – darf NICHT in Client-Bundles landen.
 * Wirft niemals: Notification ist „nice-to-have", soll andere Mutationen nicht blockieren.
 */
export async function createNotification(params: {
  companyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  href?: string | null;
}) {
  try {
    return await db.notification.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body ?? null,
        href: params.href ?? null,
      },
      select: { id: true },
    });
  } catch {
    return null;
  }
}

export async function createNotificationsForUsers(params: {
  companyId: string;
  userIds: string[];
  type: NotificationType;
  title: string;
  body?: string | null;
  href?: string | null;
}) {
  if (params.userIds.length === 0) return { count: 0 };
  try {
    const result = await db.notification.createMany({
      data: params.userIds.map((userId) => ({
        companyId: params.companyId,
        userId,
        type: params.type,
        title: params.title,
        body: params.body ?? null,
        href: params.href ?? null,
      })),
    });
    return { count: result.count };
  } catch {
    return { count: 0 };
  }
}
