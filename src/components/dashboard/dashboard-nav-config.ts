import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CalendarClock,
  FileText,
  CreditCard,
  Settings,
  Shield,
  Rss,
} from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  plans: readonly string[];
};

const ALL_PLANS = ["STARTER", "BUSINESS", "ENTERPRISE"] as const;

const BASE_NAV: DashboardNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, plans: ALL_PLANS },
  { href: "/dashboard/team", label: "Team", icon: Users, plans: ALL_PLANS },
  { href: "/dashboard/planning", label: "Planung", icon: CalendarClock, plans: ALL_PLANS },
  { href: "/dashboard/vacation", label: "Urlaub", icon: CalendarDays, plans: ALL_PLANS },
  { href: "/dashboard/reports", label: "Berichte", icon: FileText, plans: ALL_PLANS },
  { href: "/dashboard/billing", label: "Abonnement", icon: CreditCard, plans: ALL_PLANS },
  { href: "/dashboard/settings", label: "Einstellungen", icon: Settings, plans: ALL_PLANS },
];

export function getDashboardNavItems(role: string, plan: string): DashboardNavItem[] {
  const visible = BASE_NAV.filter((item) => {
    if (!item.plans.includes(plan)) return false;
    if (item.href === "/dashboard/billing" && role === "EMPLOYEE") return false;
    return true;
  });
  if (role === "SUPER_ADMIN") {
    return [
      { href: "/dashboard/partners", label: "Vertriebspartner", icon: Shield, plans: ALL_PLANS },
      { href: "/dashboard/super-admin/blog", label: "Blog-Manager", icon: Rss, plans: ALL_PLANS },
      ...visible,
    ];
  }
  return visible;
}
