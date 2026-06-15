"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Toaster } from "sonner";
import { DashboardSidebar, DashboardMobileBottomNav } from "@/components/dashboard/Sidebar";
import { DashboardTopbar } from "@/components/dashboard/Topbar";
import { SupportTicketOverlay } from "@/components/dashboard/SupportTicketOverlay";
import { DashboardPullToRefresh } from "@/components/dashboard/DashboardPullToRefresh";
import { DashboardMobileHints } from "@/components/dashboard/DashboardMobileHints";
import { OfflineClockSync } from "@/components/pwa/OfflineClockSync";
import { getMyUnreadSupportRepliesCount } from "@/lib/actions/support";
import type { CompanyModules } from "@/lib/company-modules";
import type { VocabularyLabels } from "@/lib/vocabulary";
import { VocabularyProvider } from "@/components/VocabularyContext";
import { UpgradeProvider } from "@/components/dashboard/UpgradeContext";

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
  companyModules,
  planVocabulary,
  user,
  supportUnreadCount = 0,
  initialSuperOpenTickets = 0,
  initialUnreadNotifications = 0,
  trialBanner = null,
  showPasskeyNudge = false,
}: {
  children: React.ReactNode;
  role: string;
  plan: string;
  companyModules: CompanyModules;
  planVocabulary: VocabularyLabels;
  user: SessionUser;
  supportUnreadCount?: number;
  initialSuperOpenTickets?: number;
  initialUnreadNotifications?: number;
  trialBanner?: {
    daysRemaining: number;
    activeEmployees: number;
    flyerCampaignLabel?: string | null;
    trialEndsAtIso?: string | null;
  } | null;
  showPasskeyNudge?: boolean;
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
  const pathname = usePathname();
  const employeeStampHome =
    role === "EMPLOYEE" && (pathname === "/dashboard" || pathname === "/dashboard/");
  return (
    <VocabularyProvider labels={planVocabulary}>
    <UpgradeProvider>
    <div className="dashboard-mobile-breathe flex h-screen min-h-0 w-full min-w-0 overflow-hidden overflow-x-hidden bg-background text-foreground">
      <Toaster richColors position="top-center" closeButton duration={2200} />
      <OfflineClockSync />
      <DashboardSidebar
        className="no-print"
        role={role}
        plan={plan}
        companyModules={companyModules}
        initialSuperOpenTickets={initialSuperOpenTickets}
        unreadReplies={unreadReplies}
        onOpenSupport={(mode) => {
          setSupportInitialUnread(mode === "unread");
          setSupportOverlayOpen(true);
        }}
        supportOverlayOpen={supportOverlayOpen}
      />
      <div className="dashboard-glossy-ambient relative z-0 flex min-h-0 w-full min-w-0 flex-1 flex-col">
        <DashboardTopbar
          className="no-print"
          user={user}
          minimalMobile={role === "EMPLOYEE" || ["COMPANY_OWNER", "MANAGER"].includes(role)}
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
            "dashboard-touch-scroll native-app-tap relative z-0 w-full max-w-full flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-y-contain touch-pan-y md:pt-0",
            role === "EMPLOYEE" || ["COMPANY_OWNER", "MANAGER"].includes(role)
              ? "max-md:px-4 max-md:pt-[calc(2.75rem+env(safe-area-inset-top,0px))] max-md:pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))]"
              : "max-md:px-3 max-md:pt-[calc(3.25rem+env(safe-area-inset-top,0px))] max-md:pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))]",
            "pt-[calc(4.25rem+env(safe-area-inset-top,0px))] pb-[max(6.25rem,calc(env(safe-area-inset-bottom,0px)+5.25rem))] sm:px-2 md:overflow-y-auto md:px-8 md:pb-6",
          )}
        >
          <DashboardPullToRefresh scrollRef={mainScrollRef} enabled={!employeeStampHome} />
          <div className="dashboard-shell w-full min-w-0 max-w-full overflow-x-hidden">
            <DashboardMobileHints
              role={role}
              companyModules={companyModules}
              trialBanner={trialBanner ? { ...trialBanner, role } : null}
              showPasskeyNudge={showPasskeyNudge && !trialBanner}
              pathname={pathname}
              supportUnreadCount={unreadReplies}
              onOpenSupport={(mode) => {
                setSupportInitialUnread(mode === "unread");
                setSupportOverlayOpen(true);
              }}
            />
          {children}
          {role !== "EMPLOYEE" ? (
            <footer className="no-print mb-2 mt-8 hidden text-center text-xs text-muted-foreground md:block">
              VREMA – Intelligente Zeiterfassung
            </footer>
          ) : null}
          </div>
        </main>
      </div>
      <DashboardMobileBottomNav
        className="no-print"
        role={role}
        companyModules={companyModules}
        planVocabulary={planVocabulary}
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
    </UpgradeProvider>
    </VocabularyProvider>
  );
}
