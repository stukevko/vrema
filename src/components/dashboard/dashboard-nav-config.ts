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
  LifeBuoy,
  Brain,
  UserCircle2,
  TrendingUp,
} from "lucide-react";

export type MobileBottomNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  plans: readonly string[];
};

const ALL_PLANS = ["STARTER", "BUSINESS", "ENTERPRISE"] as const;

/**
 * Mobil-Bottom-Nav (< md): feste 5 Tabs (App-Store-Niveau).
 * Support ist oben links (Glocke/Lifebuoy) erreichbar – nicht in der Leiste.
 */
export function getMobileBottomNavItems(role: string): MobileBottomNavItem[] {
  if (role === "ADVISOR") {
    return [
      { href: "/dashboard/peaks", label: "Stoß & Umsatz", icon: TrendingUp },
      { href: "/dashboard/account", label: "Profil", icon: UserCircle2 },
    ];
  }
  const profileHref = role === "EMPLOYEE" ? "/dashboard/account" : "/dashboard/settings";
  const fourthTab: MobileBottomNavItem =
    role === "EMPLOYEE"
      ? { href: "/dashboard/vacation", label: "Urlaub", icon: CalendarClock }
      : { href: "/dashboard/insights", label: "Einblicke", icon: Brain };
  return [
    { href: "/dashboard", label: "Übersicht", icon: LayoutDashboard },
    { href: "/dashboard/planning", label: "Planer", icon: CalendarDays },
    { href: "/dashboard/team", label: "Team", icon: Users },
    fourthTab,
    { href: profileHref, label: "Profil", icon: UserCircle2 },
  ];
}

/** Schlank: Kern-Navigation ohne Doppelungen (Abwesenheit, Tasks, Team-Support). */
const BASE_NAV: DashboardNavItem[] = [
  { href: "/dashboard", label: "Übersicht", icon: LayoutDashboard, plans: ALL_PLANS },
  { href: "/dashboard/insights", label: "Einblicke", icon: Brain, plans: ALL_PLANS },
  { href: "/dashboard/peaks", label: "Stoß & Umsatz", icon: TrendingUp, plans: ALL_PLANS },
  { href: "/dashboard/team", label: "Team", icon: Users, plans: ALL_PLANS },
  { href: "/dashboard/planning", label: "Planung", icon: CalendarClock, plans: ALL_PLANS },
  { href: "/dashboard/vacation", label: "Abwesenheit", icon: CalendarDays, plans: ALL_PLANS },
  { href: "/dashboard/reports", label: "Berichte", icon: FileText, plans: ALL_PLANS },
  { href: "/dashboard/support", label: "Hilfe & Support", icon: LifeBuoy, plans: ALL_PLANS },
  { href: "/dashboard/billing", label: "Abonnement", icon: CreditCard, plans: ALL_PLANS },
  { href: "/dashboard/settings", label: "Einstellungen", icon: Settings, plans: ALL_PLANS },
];

const ADVISOR_NAV: DashboardNavItem[] = [
  { href: "/dashboard/peaks", label: "Stoß & Umsatz", icon: TrendingUp, plans: ALL_PLANS },
  { href: "/dashboard/account", label: "Mein Konto", icon: UserCircle2, plans: ALL_PLANS },
];

export function getDashboardNavItems(role: string, plan: string): DashboardNavItem[] {
  if (role === "ADVISOR") {
    return ADVISOR_NAV.filter((item) => item.plans.includes(plan));
  }

  const visible = BASE_NAV.filter((item) => {
    if (!item.plans.includes(plan)) return false;
    if (item.href === "/dashboard/billing" && role === "EMPLOYEE") return false;
    if (item.href === "/dashboard/reports" && role === "EMPLOYEE") return false;
    if (item.href === "/dashboard/insights" && role === "EMPLOYEE") return false;
    if (item.href === "/dashboard/peaks" && role === "EMPLOYEE") return false;
    return true;
  }).map((item) =>
    role === "EMPLOYEE" && item.href === "/dashboard/settings"
      ? { ...item, href: "/dashboard/account", label: "Mein Konto" }
      : item,
  );

  if (role === "SUPER_ADMIN") {
    return [
      { href: "/dashboard/partners", label: "Vertriebspartner", icon: Shield, plans: ALL_PLANS },
      { href: "/dashboard/super-admin/tickets", label: "Support-Tickets", icon: LifeBuoy, plans: ALL_PLANS },
      { href: "/dashboard/super-admin/blog", label: "Blog-Manager", icon: Rss, plans: ALL_PLANS },
      ...visible,
    ];
  }
  return visible;
}
