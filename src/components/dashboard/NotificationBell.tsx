"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BellRing, Check, Loader2, Inbox } from "lucide-react";
import { toast } from "sonner";
import { AnchoredPopover } from "@/components/ui/AnchoredPopover";
import {
  countMyUnreadNotifications,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationDTO,
} from "@/lib/actions/notifications";

const POLL_MS = 60_000;
const SEEN_STORAGE_KEY = "vrema:lastNotifSeen";

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `vor ${diffD} Tag${diffD === 1 ? "" : "en"}`;
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function NotificationBell({ initialUnread = 0 }: { initialUnread?: number }) {
  const router = useRouter();
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationDTO[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const refreshUnread = useCallback(async () => {
    try {
      const n = await countMyUnreadNotifications();
      setUnread(n);
    } catch {
      /* still */
    }
  }, []);

  const refreshList = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listMyNotifications();
      setItems(rows);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setUnread(initialUnread);
  }, [initialUnread]);

  useEffect(() => {
    void refreshUnread();
    const interval = window.setInterval(() => void refreshUnread(), POLL_MS);
    const onFocus = () => void refreshUnread();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshUnread]);

  // Beim Mounten: höchste bisher gesehene Notification mit aktuellster aus dem Server abgleichen
  // → zeige Toast für genau die neueste, falls sie noch ungesehen ist.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listMyNotifications();
        if (cancelled || rows.length === 0) return;
        const latest = rows[0];
        const seen = window.localStorage.getItem(SEEN_STORAGE_KEY);
        if (seen === latest.id) return;
        if (!latest.readAt) {
          toast(latest.title, {
            description: latest.body ?? undefined,
            action: latest.href
              ? {
                  label: "Öffnen",
                  onClick: () => router.push(latest.href!),
                }
              : undefined,
          });
        }
        window.localStorage.setItem(SEEN_STORAGE_KEY, latest.id);
      } catch {
        /* still */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const togglePanel = () => {
    const next = !open;
    setOpen(next);
    if (next) void refreshList();
  };

  const handleRead = (n: NotificationDTO) => {
    if (!n.readAt) {
      setItems((rows) =>
        rows ? rows.map((r) => (r.id === n.id ? { ...r, readAt: new Date().toISOString() } : r)) : rows,
      );
      setUnread((u) => Math.max(0, u - 1));
      startTransition(async () => {
        try {
          await markNotificationRead(n.id);
        } catch {
          await refreshUnread();
        }
        router.refresh();
      });
    }
    if (n.href) {
      setOpen(false);
      router.push(n.href);
    }
  };

  const handleMarkAll = () => {
    if (unread === 0) return;
    setItems((rows) => (rows ? rows.map((r) => ({ ...r, readAt: r.readAt ?? new Date().toISOString() })) : rows));
    setUnread(0);
    startTransition(async () => {
      try {
        await markAllNotificationsRead();
        toast.success("Alle Benachrichtigungen gelesen.");
      } catch {
        await refreshUnread();
        toast.error("Konnte nicht alle als gelesen markieren.");
      }
      router.refresh();
    });
  };

  const hasUnread = unread > 0;
  const badgeText = unread > 9 ? "9+" : String(unread);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={togglePanel}
        aria-label={hasUnread ? `${unread} neue Benachrichtigungen` : "Benachrichtigungen"}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border bg-card/95 shadow-sm transition-all active:scale-95 md:h-11 md:w-11 md:hover:bg-card ${
          hasUnread ? "border-red-300/60 dark:border-red-500/30" : "border-border"
        }`}
      >
        {hasUnread ? (
          <BellRing className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden />
        ) : (
          <Bell className="h-4 w-4 text-muted-foreground" aria-hidden />
        )}
        {hasUnread ? (
          <span
            className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow ring-2 ring-card"
            aria-hidden
          >
            {badgeText}
          </span>
        ) : null}
        {hasUnread ? (
          <span className="absolute inset-0 rounded-2xl bg-red-500/15 motion-safe:animate-ping" aria-hidden />
        ) : null}
      </button>

      <AnchoredPopover
        open={open}
        anchorRef={triggerRef}
        align="end"
        onClose={() => setOpen(false)}
        role="dialog"
        aria-label="Benachrichtigungen"
        className="w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-popover p-1.5 shadow-2xl ring-1 ring-black/5 dark:ring-white/[0.04]"
      >
        <div ref={popoverRef}>
          <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Benachrichtigungen</p>
              <p className="text-[11px] text-muted-foreground">
                {hasUnread ? `${unread} neu` : "Alles gelesen"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={!hasUnread}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <Check className="h-3 w-3" aria-hidden />
              Alle gelesen
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-border/60 bg-surface-muted/60 dark:bg-surface-muted/40">
            {loading && items === null ? (
              <div className="flex items-center justify-center gap-2 px-3 py-6 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Lade …
              </div>
            ) : items && items.length > 0 ? (
              <ul className="divide-y divide-border">
                {items.map((n) => {
                  const isUnread = !n.readAt;
                  const Item = (
                    <button
                      type="button"
                      onClick={() => handleRead(n)}
                      className={`flex w-full items-start gap-2 px-3 py-3 text-left transition-colors ${
                        isUnread ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/60"
                      }`}
                    >
                      <span
                        className={`mt-1 inline-flex h-2 w-2 shrink-0 rounded-full ${
                          isUnread ? "bg-primary" : "bg-transparent"
                        }`}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm leading-snug ${isUnread ? "font-semibold text-foreground" : "text-foreground/90"}`}>
                          {n.title}
                        </span>
                        {n.body ? (
                          <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
                            {n.body}
                          </span>
                        ) : null}
                        <span className="mt-1 block text-[10px] uppercase tracking-wide text-muted-foreground/80">
                          {formatRelative(n.createdAt)}
                        </span>
                      </span>
                    </button>
                  );
                  return <li key={n.id}>{Item}</li>;
                })}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <Inbox className="h-6 w-6 text-muted-foreground/70" aria-hidden />
                <p className="text-sm font-medium text-foreground">Keine Benachrichtigungen</p>
                <p className="text-[12px] text-muted-foreground">
                  Sobald dein Chef etwas entscheidet, siehst du es hier zuerst.
                </p>
              </div>
            )}
          </div>

          <div className="px-3 py-2">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="block text-center text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              Zum Dashboard
            </Link>
          </div>
        </div>
      </AnchoredPopover>
    </div>
  );
}
