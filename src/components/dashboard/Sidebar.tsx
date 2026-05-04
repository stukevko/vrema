"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarClock, FileText, Settings, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import clsx from "clsx";
import { getDashboardNavItems } from "./dashboard-nav-config";

/** Nur Mobil (< md): Daumen-Zone, vier Kernrouten — kein Hamburger, Rest über Einstellungen/Dashboard. */
const MOBILE_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/planning", label: "Planen", icon: CalendarClock },
  { href: "/dashboard/reports", label: "Berichte", icon: FileText },
  { href: "/dashboard/settings", label: "Einstellungen", icon: Settings },
];

interface SidebarProps {
  role: string;
  plan: string;
}

export function DashboardSidebar({ role, plan }: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = getDashboardNavItems(role, plan);

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r border-border glass-nav md:flex md:h-[100dvh] md:max-h-[100dvh] md:w-80 md:min-h-0">
      <Link
        href="/dashboard"
        className="group flex flex-col items-center border-b border-border px-4 py-4 text-center transition-colors md:px-5 md:py-4 md:hover:bg-muted/25"
      >
        <span className="flex w-full justify-center">
          <Image
            src="/vrema_logo.png"
            alt="VREMA"
            width={240}
            height={68}
            priority
            className="h-auto w-auto max-h-9 object-contain md:max-h-10"
          />
        </span>
        <p className="mt-2.5 max-w-[16rem] text-center text-[10px] font-semibold uppercase leading-snug tracking-[0.14em] text-muted-foreground">
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

export function DashboardMobileBottomNav() {
  const pathname = usePathname();
  const items = MOBILE_NAV_ITEMS;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md md:hidden"
      aria-label="Hauptnavigation"
    >
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-0.5">
        {items.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[10px] font-semibold leading-tight transition-transform duration-100 active:scale-95",
                isActive ? "bg-primary/12 text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-6 w-6 shrink-0 stroke-[1.75]" aria-hidden />
              <span className="line-clamp-2 text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
