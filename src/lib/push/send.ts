import webpush from "web-push";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Server-only Web-Push-Versand.
 *
 * Wirft NIEMALS: Push ist „nice-to-have" und darf die auslösende Mutation
 * (Notification anlegen) nicht blockieren. Tote Abos (404/410) werden
 * automatisch entfernt, damit die Tabelle sauber bleibt.
 */

export type PushPayload = {
  title: string;
  body?: string;
  /** Deep-Link, der bei Klick auf die Notification geöffnet wird. */
  url?: string;
};

let configured: boolean | null = null;

/** VAPID einmalig konfigurieren. Gibt false zurück, wenn Keys fehlen. */
function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }
  try {
    webpush.setVapidDetails(
      env.VAPID_SUBJECT || "mailto:kontakt@kevko.studio",
      publicKey,
      privateKey,
    );
    configured = true;
  } catch {
    configured = false;
  }
  return configured;
}

/** True, wenn Push serverseitig konfiguriert ist (für Diagnostik). */
export function isPushConfigured(): boolean {
  return ensureConfigured();
}

/**
 * Sendet eine Push-Nachricht an alle Geräte der gegebenen User.
 * Hängt pro Empfänger den aktuellen Ungelesen-Zähler an (fürs Homescreen-Badge).
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return;

  try {
    const [subscriptions, unreadRows] = await Promise.all([
      db.pushSubscription.findMany({ where: { userId: { in: unique } } }),
      db.notification.groupBy({
        by: ["userId"],
        where: { userId: { in: unique }, readAt: null },
        _count: { _all: true },
      }),
    ]);

    if (subscriptions.length === 0) return;

    const unreadByUser = new Map<string, number>();
    for (const row of unreadRows) unreadByUser.set(row.userId, row._count._all);

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const body = JSON.stringify({
          title: payload.title,
          body: payload.body ?? "",
          url: payload.url ?? "/dashboard",
          unread: unreadByUser.get(sub.userId) ?? 0,
        });
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            body,
          );
        } catch (err) {
          // 404 (Gone) / 410 (Not Found) → Abo ist tot, aufräumen.
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await db.pushSubscription
              .delete({ where: { endpoint: sub.endpoint } })
              .catch(() => {});
          }
        }
      }),
    );
  } catch {
    /* Push-Fehler nie eskalieren */
  }
}
