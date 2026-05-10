"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { Toaster } from "sonner";
import { DashboardSidebar, DashboardMobileBottomNav } from "@/components/dashboard/Sidebar";
import { DashboardTopbar } from "@/components/dashboard/Topbar";
import { SupportTicketOverlay } from "@/components/dashboard/SupportTicketOverlay";
import { getMyUnreadSupportRepliesCount } from "@/lib/actions/support";

type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
};

export function DashboardLayoutClient({
  children,
  role,
  plan,
  user,
  supportUnreadCount = 0,
  initialSuperOpenTickets = 0,
  initialUnreadNotifications = 0,
}: {
  children: React.ReactNode;
  role: string;
  plan: string;
  user: SessionUser;
  supportUnreadCount?: number;
  initialSuperOpenTickets?: number;
  initialUnreadNotifications?: number;
}) {
  const [supportOverlayOpen, setSupportOverlayOpen] = useState(false);
  const [supportInitialUnread, setSupportInitialUnread] = useState(false);
  const [unreadReplies, setUnreadReplies] = useState(supportUnreadCount);
  const [supportNonce, setSupportNonce] = useState(0);

  useEffect(() => {
    setUnreadReplies(supportUnreadCount);
  }, [supportUnreadCount]);

  const refreshSupportUnread = useCallback(async () => {
    try {
      const n = await getMyUnreadSupportRepliesCount();
      setUnreadReplies(n);
    } catch {
      setUnreadReplies(0);
    }
  }, []);

  useEffect(() => {
    void refreshSupportUnread();
  }, [supportNonce, refreshSupportUnread]);

  const bumpSupport = useCallback(() => {
    setSupportNonce((x) => x + 1);
  }, []);

  return (
    <div className="flex h-screen min-h-0 w-full min-w-0 overflow-hidden overflow-x-hidden bg-background text-foreground">
      <Toaster richColors position="top-center" closeButton duration={2200} />
      <DashboardSidebar
        role={role}
        plan={plan}
        initialSuperOpenTickets={initialSuperOpenTickets}
        unreadReplies={unreadReplies}
        onOpenSupport={(mode) => {
          setSupportInitialUnread(mode === "unread");
          setSupportOverlayOpen(true);
        }}
        supportOverlayOpen={supportOverlayOpen}
      />
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <DashboardTopbar user={user} unreadNotifications={initialUnreadNotifications} />
        <main
          className={clsx(
            "dashboard-touch-scroll native-app-tap flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-manipulation pt-[calc(4rem+env(safe-area-inset-top,0px))] md:pt-0",
            role === "EMPLOYEE"
              ? "px-[max(0.25rem,env(safe-area-inset-left))] pr-[max(0.25rem,env(safe-area-inset-right))] pb-[max(7.5rem,calc(env(safe-area-inset-bottom)+6rem))] sm:px-2 md:px-8 md:pb-6"
              : "px-2 pb-32 sm:px-3 md:px-8 md:pb-6",
          )}
        >
          {unreadReplies > 0 ? (
            <div className="mb-4 rounded-2xl border border-brand/25 bg-brand-soft/80 px-4 py-3 text-sm text-foreground dark:border-white/10 dark:bg-brand/18 md:mb-5">
              <p className="font-medium">Du hast eine Antwort auf dein Support-Ticket erhalten.</p>
              <button
                type="button"
                onClick={() => {
                  setSupportInitialUnread(true);
                  setSupportOverlayOpen(true);
                }}
                className="mt-2 inline-flex text-sm font-semibold text-brand underline-offset-4 hover:underline"
              >
                Antwort im Support-Postfach öffnen
              </button>
            </div>
          ) : null}
          {children}
          <footer className="mb-2 mt-8 text-center text-xs text-muted-foreground">VREMA – Intelligente Zeiterfassung</footer>
        </main>
      </div>
      <DashboardMobileBottomNav
        role={role}
        unreadReplies={unreadReplies}
        onOpenSupport={(mode) => {
          setSupportInitialUnread(mode === "unread");
          setSupportOverlayOpen(true);
        }}
        supportOverlayOpen={supportOverlayOpen}
      />
      <SupportTicketOverlay
        open={supportOverlayOpen}
        initialFocusUnread={supportInitialUnread}
        onInitialFocusUnreadConsumed={() => setSupportInitialUnread(false)}
        onSupportActivity={bumpSupport}
        onClose={() => {
          setSupportOverlayOpen(false);
          bumpSupport();
        }}
      />
    </div>
  );
}
