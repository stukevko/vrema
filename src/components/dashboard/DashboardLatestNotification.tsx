"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import {
  listMyNotifications,
  markNotificationRead,
  type NotificationDTO,
} from "@/lib/actions/notifications";

/**
 * Mobil Start: genau eine aktuelle ungelesene Benachrichtigung — kein Toast-Stack.
 */
export function DashboardLatestNotification() {
  const router = useRouter();
  const [latest, setLatest] = useState<NotificationDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    try {
      const rows = await listMyNotifications();
      const unread = rows.find((r) => !r.readAt) ?? null;
      setLatest(unread);
    } catch {
      setLatest(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  if (loading || !latest) return null;

  const dismiss = () => {
    const id = latest.id;
    setLatest(null);
    startTransition(async () => {
      try {
        await markNotificationRead(id);
        router.refresh();
      } catch {
        await refresh();
      }
    });
  };

  const content = (
    <>
      <Bell className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-snug text-foreground">{latest.title}</span>
        {latest.body ? (
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{latest.body}</span>
        ) : null}
      </span>
    </>
  );

  return (
    <div className="no-print mb-3 md:hidden">
      {latest.href ? (
        <Link
          href={latest.href}
          onClick={() => {
            void markNotificationRead(latest.id);
            setLatest(null);
          }}
          className="flex items-start gap-2.5 rounded-2xl border border-brand/25 bg-brand-soft/60 px-4 py-3 text-left transition-colors active:scale-[0.99] dark:border-white/10 dark:bg-brand/15"
        >
          {content}
        </Link>
      ) : (
        <div className="flex items-start gap-2.5 rounded-2xl border border-brand/25 bg-brand-soft/60 px-4 py-3 dark:border-white/10 dark:bg-brand/15">
          {content}
        </div>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Benachrichtigung schließen"
        className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3" aria-hidden />
        Schließen
      </button>
    </div>
  );
}
