"use client";

import { useCallback, useState } from "react";
import { DashboardSidebar, DashboardMobileBottomNav } from "@/components/dashboard/Sidebar";
import { DashboardMobileNavDrawer } from "@/components/dashboard/MobileNavDrawer";
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
  const [navOpen, setNavOpen] = useState(false);
  const openNav = useCallback(() => setNavOpen(true), []);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <DashboardSidebar role={role} plan={plan} />
      <DashboardMobileNavDrawer open={navOpen} onOpenChange={setNavOpen} role={role} plan={plan} />
      <div className="flex min-w-0 flex-1 flex-col bg-background lg:min-h-screen">
        <DashboardTopbar user={user} onOpenMobileNav={openNav} />
        <main className="flex-1 overflow-auto p-4 pb-28 pt-[calc(4rem+env(safe-area-inset-top,0px))] lg:p-8 lg:pb-6 lg:pt-0">
          {children}
          <footer className="mb-2 mt-8 text-center text-xs text-muted-foreground">VREMA – Intelligente Zeiterfassung</footer>
        </main>
      </div>
      <DashboardMobileBottomNav role={role} />
    </div>
  );
}
