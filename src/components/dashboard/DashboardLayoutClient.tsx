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
    <div className="flex w-full min-w-0 min-h-[100dvh] bg-background text-foreground overflow-x-hidden md:min-h-screen">
      <DashboardSidebar role={role} plan={plan} />
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col bg-background max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:overflow-hidden md:min-h-screen">
        <DashboardTopbar user={user} />
        <main className="dashboard-touch-scroll native-app-tap flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-2 pb-32 pt-[calc(4rem+env(safe-area-inset-top,0px))] touch-manipulation sm:px-3 md:px-8 md:pb-6 md:pt-0">
          {children}
          <footer className="mb-2 mt-8 text-center text-xs text-muted-foreground">VREMA – Intelligente Zeiterfassung</footer>
        </main>
      </div>
      <DashboardMobileBottomNav />
    </div>
  );
}
