"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Toaster } from "sonner";
import { DashboardSidebar, DashboardMobileBottomNav } from "@/components/dashboard/Sidebar";
import { DashboardTopbar } from "@/components/dashboard/Topbar";
import { SupportTicketOverlay } from "@/components/dashboard/SupportTicketOverlay";
import { DashboardPullToRefresh } from "@/components/dashboard/DashboardPullToRefresh";
import { PwaInstallHint } from "@/components/dashboard/PwaInstallHint";
import { TrialStatusBanner } from "@/components/dashboard/TrialStatusBanner";
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
  trialBanner = null,
}: {
  children: React.ReactNode;
  role: string;
  plan: string;
  user: SessionUser;
  supportUnreadCount?: number;
  initialSuperOpenTickets?: number;
  initialUnreadNotifications?: number;
  trialBanner?: { daysRemaining: number; activeEmployees: number } | null;
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

  const mainScrollRef = useRef<HTMLElement | null>(null);

  return (
    <div className="flex h-screen min-h-0 w-full min-w-0 overflow-hidden overflow-x-hidden bg-background text-foreground">
      <Toaster richColors position="top-center" closeButton duration={2200} />
      <DashboardSidebar
        className="no-print"
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
      <div className="relative z-0 flex min-h-0 w-full min-w-0 flex-1 flex-col bg-background">
        <DashboardTopbar
          className="no-print"
          user={user}
          unreadNotifications={initialUnreadNotifications}
          onOpenSupport={(mode) => {
            setSupportInitialUnread(mode === "unread");
            setSupportOverlayOpen(true);
          }}
          unreadSupportReplies={unreadReplies}
        />
        <main
          ref={mainScrollRef}
          className={clsx(
            "dashboard-touch-scroll native-app-tap relative z-0 w-full max-w-full flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-y-contain overscroll-x-none overscroll-behavior-y-contain touch-pan-y pt-[calc(4rem+env(safe-area-inset-top,0px))] md:pt-0",
            "px-4 max-md:pl-[max(1rem,env(safe-area-inset-left,0px))] max-md:pr-[max(1rem,env(safe-area-inset-right,0px))] sm:px-2 md:px-8",
            "pb-[max(5.75rem,calc(env(safe-area-inset-bottom,0px)+4.75rem))] md:pb-6",
          )}
        >
          <DashboardPullToRefresh scrollRef={mainScrollRef} />
          <div className="dashboard-shell w-full min-w-0 max-w-full overflow-x-hidden">
            <PwaInstallHint />
          {trialBanner ? (
            <TrialStatusBanner
              daysRemaining={trialBanner.daysRemaining}
              activeEmployees={trialBanner.activeEmployees}
            />
          ) : null}
          {unreadReplies > 0 ? (
            <div className="no-print mb-4 min-w-0 max-w-full rounded-2xl border border-brand/25 bg-brand-soft/80 px-4 py-3 text-sm text-foreground dark:border-white/10 dark:bg-brand/18 md:mb-5">
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
          <footer className="no-print mb-2 mt-8 text-center text-xs text-muted-foreground">VREMA – Intelligente Zeiterfassung</footer>
          </div>
        </main>
      </div>
      <DashboardMobileBottomNav className="no-print" role={role} />
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
