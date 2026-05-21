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
  ListTodo,
} from "lucide-react";
import type { CompanyModuleKey, CompanyModules } from "@/lib/company-modules";

export type MobileBottomNavItem = {
  href: string;
  label: string;
  /** Kurzer Kontext unter dem Tab-Label (nur Mobil). */
  subtitle: string;
  icon: LucideIcon;
};

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  plans: readonly string[];
  /** Leer = immer sichtbar (Kern). Sonst müssen alle Module aktiv sein. */
  requiresModules?: CompanyModuleKey[];
};

const ALL_PLANS = ["STARTER", "BUSINESS", "ENTERPRISE"] as const;

/**
 * Mobil-Bottom-Nav (< md): feste 5 Tabs (App-Store-Niveau).
 */
export function getMobileBottomNavItems(role: string, modules: CompanyModules): MobileBottomNavItem[] {
  if (role === "ADVISOR") {
    return [
      { href: "/dashboard/peaks", label: "Stoß", subtitle: "Umsatz", icon: TrendingUp },
      { href: "/dashboard/account", label: "Profil", subtitle: "Konto", icon: UserCircle2 },
    ];
  }
  const profileHref = role === "EMPLOYEE" ? "/dashboard/account" : "/dashboard/settings";
  const fourthTab: MobileBottomNavItem =
    role === "EMPLOYEE"
      ? { href: "/dashboard/vacation", label: "Urlaub", subtitle: "Frei/Tage", icon: CalendarClock }
      : { href: "/dashboard/insights", label: "Auswertung", subtitle: "Hinweise", icon: Brain };
  const items: MobileBottomNavItem[] = [
    {
      href: "/dashboard",
      label: role === "EMPLOYEE" ? "Heute" : "Start",
      subtitle: role === "EMPLOYEE" ? "Stempeln" : "Fokus",
      icon: LayoutDashboard,
    },
    {
      href: "/dashboard/planning",
      label: "Planer",
      subtitle: role === "EMPLOYEE" ? "Schichten" : "Woche",
      icon: CalendarDays,
    },
    {
      href: "/dashboard/team",
      label: "Team",
      subtitle: role === "EMPLOYEE" ? "Kollegen" : "Leute",
      icon: Users,
    },
    fourthTab,
    {
      href: profileHref,
      label: "Profil",
      subtitle: role === "EMPLOYEE" ? "Konto" : "Setup",
      icon: UserCircle2,
    },
  ];
  if (role !== "EMPLOYEE") {
    return [
      items[0]!,
      items[1]!,
      items[2]!,
      { href: "/dashboard/reports", label: "Berichte", subtitle: "Stunden", icon: FileText },
      items[4]!,
    ];
  }
  return items;
}

/** Kern-Navigation — optionale Module per `requiresModules`. */
const BASE_NAV: DashboardNavItem[] = [
  { href: "/dashboard", label: "Übersicht", icon: LayoutDashboard, plans: ALL_PLANS },
  { href: "/dashboard/insights", label: "Auswertung", icon: Brain, plans: ALL_PLANS },
  {
    href: "/dashboard/peaks",
    label: "Stoß & Umsatz",
    icon: TrendingUp,
    plans: ALL_PLANS,
    requiresModules: ["peaks"],
  },
  { href: "/dashboard/team", label: "Team", icon: Users, plans: ALL_PLANS },
  { href: "/dashboard/planning", label: "Planung", icon: CalendarClock, plans: ALL_PLANS },
  {
    href: "/dashboard/tasks",
    label: "Schicht-Tasks",
    icon: ListTodo,
    plans: ALL_PLANS,
    requiresModules: ["shiftTasks"],
  },
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

function navItemAllowed(item: DashboardNavItem, modules: CompanyModules): boolean {
  if (!item.requiresModules?.length) return true;
  return item.requiresModules.every((m) => modules[m]);
}

export function getDashboardNavItems(
  role: string,
  plan: string,
  modules: CompanyModules,
): DashboardNavItem[] {
  if (role === "ADVISOR") {
    return ADVISOR_NAV.filter((item) => item.plans.includes(plan));
  }

  const visible = BASE_NAV.filter((item) => {
    if (!item.plans.includes(plan)) return false;
    if (!navItemAllowed(item, modules)) return false;
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
