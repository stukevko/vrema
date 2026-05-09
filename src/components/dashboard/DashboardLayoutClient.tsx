"use client";

import Link from "next/link";
import { DashboardSidebar, DashboardMobileBottomNav } from "@/components/dashboard/Sidebar";
import { DashboardTopbar } from "@/components/dashboard/Topbar";
import { SupportTicketOverlay } from "@/components/dashboard/SupportTicketOverlay";
import { useState } from "react";

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
}: {
  children: React.ReactNode;
  role: string;
  plan: string;
  user: SessionUser;
  supportUnreadCount?: number;
  initialSuperOpenTickets?: number;
}) {
  const [supportOverlayOpen, setSupportOverlayOpen] = useState(false);

  return (
    <div className="flex h-screen min-h-0 w-full min-w-0 overflow-hidden overflow-x-hidden bg-slate-50 text-foreground">
      <DashboardSidebar
        role={role}
        plan={plan}
        initialSuperOpenTickets={initialSuperOpenTickets}
        onOpenSupport={() => setSupportOverlayOpen(true)}
        supportOverlayOpen={supportOverlayOpen}
      />
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-50">
        <DashboardTopbar user={user} />
        <main className="dashboard-touch-scroll native-app-tap flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-2 pb-32 pt-[calc(4rem+env(safe-area-inset-top,0px))] touch-manipulation sm:px-3 md:px-8 md:pb-6 md:pt-0">
          {supportUnreadCount > 0 ? (
            <div className="mb-4 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-foreground md:mb-5">
              <p className="font-medium">Du hast eine Antwort auf dein Support-Ticket erhalten.</p>
              <Link href="/dashboard/support" className="mt-2 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline">
                Zum Support-Bereich
              </Link>
            </div>
          ) : null}
          {children}
          <footer className="mb-2 mt-8 text-center text-xs text-muted-foreground">VREMA – Intelligente Zeiterfassung</footer>
        </main>
      </div>
      <DashboardMobileBottomNav
        onOpenSupport={() => setSupportOverlayOpen(true)}
        supportOverlayOpen={supportOverlayOpen}
      />
      <SupportTicketOverlay open={supportOverlayOpen} onClose={() => setSupportOverlayOpen(false)} />
    </div>
  );
}
