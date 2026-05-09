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
  ClipboardCheck,
  MessagesSquare,
  ListTodo,
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
  { href: "/dashboard/team/absences", label: "Abwesenheiten", icon: ClipboardCheck, plans: ALL_PLANS },
  { href: "/dashboard/planning", label: "Planung", icon: CalendarClock, plans: ALL_PLANS },
  { href: "/dashboard/tasks", label: "Schicht-Tasks", icon: ListTodo, plans: ALL_PLANS },
  { href: "/dashboard/vacation", label: "Urlaub", icon: CalendarDays, plans: ALL_PLANS },
  { href: "/dashboard/reports", label: "Berichte", icon: FileText, plans: ALL_PLANS },
  { href: "/dashboard/support", label: "Hilfe & Support", icon: LifeBuoy, plans: ALL_PLANS },
  { href: "/dashboard/billing", label: "Abonnement", icon: CreditCard, plans: ALL_PLANS },
  { href: "/dashboard/settings", label: "Einstellungen", icon: Settings, plans: ALL_PLANS },
];

export function getDashboardNavItems(role: string, plan: string): DashboardNavItem[] {
  const teamSupportItem: DashboardNavItem = {
    href: "/dashboard/admin/support",
    label: "Team-Support",
    icon: MessagesSquare,
    plans: ALL_PLANS,
  };

  const visible = BASE_NAV.filter((item) => {
    if (!item.plans.includes(plan)) return false;
    if (item.href === "/dashboard/billing" && role === "EMPLOYEE") return false;
    if (item.href === "/dashboard/team/absences" && role === "EMPLOYEE") return false;
    if (item.href === "/dashboard/tasks" && role === "EMPLOYEE") return false;
    return true;
  });

  let composed = [...visible];
  if (["COMPANY_OWNER", "MANAGER"].includes(role) && role !== "SUPER_ADMIN") {
    const teamIdx = composed.findIndex((i) => i.href === "/dashboard/team");
    if (teamIdx >= 0) {
      composed = [...composed.slice(0, teamIdx + 1), teamSupportItem, ...composed.slice(teamIdx + 1)];
    } else {
      composed = [teamSupportItem, ...composed];
    }
  }

  if (role === "SUPER_ADMIN") {
    return [
      { href: "/dashboard/partners", label: "Vertriebspartner", icon: Shield, plans: ALL_PLANS },
      { href: "/dashboard/super-admin/tickets", label: "Support-Tickets", icon: LifeBuoy, plans: ALL_PLANS },
      { href: "/dashboard/super-admin/blog", label: "Blog-Manager", icon: Rss, plans: ALL_PLANS },
      ...composed,
    ];
  }
  return composed;
}
