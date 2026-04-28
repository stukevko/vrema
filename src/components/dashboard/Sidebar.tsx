"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CalendarClock,
  FileText,
  CreditCard,
  Settings,
  LogOut,
  Timer,
  Shield,
} from "lucide-react";
import { signOut } from "next-auth/react";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, plans: ["STARTER", "BUSINESS", "ENTERPRISE"] },
  { href: "/dashboard/team", label: "Team", icon: Users, plans: ["STARTER", "BUSINESS", "ENTERPRISE"] },
  { href: "/dashboard/planning", label: "Planung", icon: CalendarClock, plans: ["STARTER", "BUSINESS", "ENTERPRISE"] },
  { href: "/dashboard/vacation", label: "Urlaub", icon: CalendarDays, plans: ["STARTER", "BUSINESS", "ENTERPRISE"] },
  { href: "/dashboard/reports", label: "Berichte", icon: FileText, plans: ["STARTER", "BUSINESS", "ENTERPRISE"] },
  { href: "/dashboard/billing", label: "Abonnement", icon: CreditCard, plans: ["STARTER", "BUSINESS", "ENTERPRISE"] },
  { href: "/dashboard/settings", label: "Einstellungen", icon: Settings, plans: ["STARTER", "BUSINESS", "ENTERPRISE"] },
];

const MOBILE_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard#terminal-widget", label: "Terminal", icon: Timer },
  { href: "/dashboard/planning", label: "Planung", icon: CalendarClock },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

interface SidebarProps {
  role: string;
  plan: string;
}

export function DashboardSidebar({ role, plan }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.plans.includes(plan)) return false;
    if (item.href === "/dashboard/billing" && role === "EMPLOYEE") return false;
    return true;
  });
  if (role === "SUPER_ADMIN") {
    visibleItems.unshift({
      href: "/dashboard/partners",
      label: "Vertriebspartner",
      icon: Shield,
      plans: ["STARTER", "BUSINESS", "ENTERPRISE"],
    });
  }

  return (
    <aside className="hidden md:flex w-60 flex-col bg-[#0d0d0d] border-r border-white/5 sticky top-0 h-screen">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-white/5">
        <Image src="/vremalogo.png" alt="Vrema" width={48} height={48} className="shrink-0 -my-2" />
        <div>
          <span className="font-bold text-base tracking-tight">Vrema</span>
          <span className="block text-[9px] text-white/25 font-mono uppercase tracking-widest -mt-0.5">by KevkoStudio</span>
        </div>
      </div>

      {/* Plan badge */}
      <div className="px-4 pt-4">
        <div className="px-3 py-1.5 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] text-xs font-semibold capitalize">
          {plan} Plan
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-[#22c55e]/10 text-[#22c55e]"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-red-400 hover:bg-red-400/5 transition-all"
        >
          <LogOut className="w-4 h-4" />
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0b0b0b]/95 backdrop-blur px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-2">
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
                "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors",
                isActive ? "text-[#22c55e] bg-[#22c55e]/10" : "text-white/50"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
