"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Timer, CalendarClock, CreditCard, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import clsx from "clsx";
import { getDashboardNavItems } from "./dashboard-nav-config";

const MOBILE_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard#terminal-widget", label: "Terminal", icon: Timer },
  { href: "/dashboard/planning", label: "Planung", icon: CalendarClock },
  { href: "/dashboard/billing", label: "Abonnement", icon: CreditCard },
];

interface SidebarProps {
  role: string;
  plan: string;
}

export function DashboardSidebar({ role, plan }: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = getDashboardNavItems(role, plan);

  return (
    <aside className="hidden h-screen w-72 shrink-0 flex-col border-r border-border glass-nav lg:flex lg:w-80">
      <Link
        href="/dashboard"
        className="group block border-b border-border px-6 py-6 transition-colors md:hover:bg-muted/25"
      >
        <Image
          src="/vrema_logo.png"
          alt="VREMA"
          width={400}
          height={112}
          priority
          className="h-auto w-full max-h-[7.5rem] object-contain object-left lg:max-h-[8.25rem]"
        />
        <p className="mt-3 text-[10px] font-semibold uppercase leading-relaxed tracking-[0.2em] text-muted-foreground">
          Intelligente Zeiterfassung
        </p>
      </Link>

      <div className="px-5 pt-5">
        <div className="rounded-2xl border border-border bg-muted/40 px-4 py-1.5 text-xs font-semibold capitalize text-foreground">
          {plan} Plan
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex min-h-11 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all active:scale-95",
                isActive
                  ? "bg-muted text-foreground backdrop-blur-sm"
                  : "text-muted-foreground md:hover:bg-card/70 md:hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all active:scale-95 md:hover:bg-red-100 md:hover:text-red-500"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Abmelden
        </button>
      </div>
    </aside>
  );
}

export function DashboardMobileBottomNav({ role }: { role?: string }) {
  const pathname = usePathname();
  const items = MOBILE_NAV_ITEMS.filter((item) => !(item.href === "/dashboard/billing" && role === "EMPLOYEE"));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 rounded-t-3xl border-t border-border bg-white/80 px-2 pt-2 shadow-[0_-12px_24px_rgba(0,0,0,0.18)] backdrop-blur-xl pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
      <div className="grid grid-cols-4 gap-1">
        {items.map((item) => {
          const isActive =
            item.href === "/dashboard#terminal-widget"
              ? pathname === "/dashboard"
              : pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-all active:scale-95",
                isActive ? "bg-primary/10 text-primary backdrop-blur-sm" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
