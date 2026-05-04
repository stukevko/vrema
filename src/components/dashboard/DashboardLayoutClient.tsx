"use client";

import { DashboardSidebar, DashboardMobileBottomNav } from "@/components/dashboard/Sidebar";
import { DashboardTopbar } from "@/components/dashboard/Topbar";

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
}: {
  children: React.ReactNode;
  role: string;
  plan: string;
  user: SessionUser;
}) {
  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-x-hidden">
      <DashboardSidebar role={role} plan={plan} />
      <div className="flex min-w-0 flex-1 flex-col bg-background md:min-h-screen">
        <DashboardTopbar user={user} />
        <main className="dashboard-touch-scroll native-app-tap h-auto min-h-0 overflow-y-auto overscroll-y-contain px-2 pb-32 pt-[calc(4rem+env(safe-area-inset-top,0px))] touch-manipulation sm:px-3 md:flex-1 md:overflow-auto md:px-8 md:pb-6 md:pt-0">
          {children}
          <footer className="mb-2 mt-8 text-center text-xs text-muted-foreground">VREMA – Intelligente Zeiterfassung</footer>
        </main>
      </div>
      <DashboardMobileBottomNav />
    </div>
  );
}
