"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import clsx from "clsx";
import { getDashboardNavItems, getMobileBottomNavItems } from "./dashboard-nav-config";
import type { CompanyModules } from "@/lib/company-modules";
import type { VocabularyLabels } from "@/lib/vocabulary";
import { useEffect, useState } from "react";
import { countOpenSupportTicketsForSuperAdmin } from "@/lib/actions/support";
import { countPendingShiftTradeApprovals } from "@/lib/actions/team";
import { VremaLockup } from "@/components/brand/VremaMarkLogo";
import { SafeLucideIcon } from "@/lib/icons/safe-lucide";

/** Nur Mobil (< md): Daumen-Zone — Items aus `getMobileBottomNavItems(role)`. */

interface SidebarProps {
  role: string;
  plan: string;
  companyModules: CompanyModules;
  className?: string;
  initialSuperOpenTickets?: number;
  unreadReplies?: number;
  onOpenSupport?: (mode?: "default" | "unread") => void;
  supportOverlayOpen?: boolean;
}

export function DashboardSidebar({
  role,
  plan,
  companyModules,
  className,
  initialSuperOpenTickets = 0,
  unreadReplies = 0,
  onOpenSupport,
  supportOverlayOpen = false,
}: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = getDashboardNavItems(role, plan, companyModules);
  const [pendingTradeApprovals, setPendingTradeApprovals] = useState(0);
  const [openSuperTickets, setOpenSuperTickets] = useState(initialSuperOpenTickets);
  const canManageTrades =
    companyModules.shiftTrade && ["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role);

  useEffect(() => {
    setOpenSuperTickets(initialSuperOpenTickets);
  }, [initialSuperOpenTickets]);

  useEffect(() => {
    if (role !== "SUPER_ADMIN") return;
    let mounted = true;
    void (async () => {
      try {
        const n = await countOpenSupportTicketsForSuperAdmin();
        if (mounted) setOpenSuperTickets(n);
      } catch {
        if (mounted) setOpenSuperTickets(0);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [role, pathname]);

  useEffect(() => {
    if (!canManageTrades) return;
    let mounted = true;
    void (async () => {
      try {
        const count = await countPendingShiftTradeApprovals();
        if (mounted) setPendingTradeApprovals(count);
      } catch {
        if (mounted) setPendingTradeApprovals(0);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [canManageTrades]);

  return (
    <aside
      className={clsx(
        "hidden w-72 shrink-0 flex-col overflow-y-auto border-r border-border glass-nav md:flex md:w-80 md:min-h-0",
        className,
      )}
    >
      <Link
        href="/dashboard"
        className="group flex flex-col items-center border-b border-border px-4 py-5 text-center transition-colors md:px-5 md:hover:bg-muted/25"
        aria-label="VREMA Dashboard"
      >
        <VremaLockup size={36} className="text-foreground" />
        <p className="mt-2.5 max-w-[16rem] text-center text-[10px] font-semibold uppercase leading-snug tracking-[0.14em] text-muted-foreground">
          Intelligente Zeiterfassung
        </p>
      </Link>

      <div className="px-5 pt-5">
        <div className="rounded-2xl border border-border bg-muted/40 px-4 py-1.5 text-xs font-semibold capitalize text-foreground">
          {plan} Plan
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-5">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          if (item.href === "/dashboard/support") {
            const supportActive = supportOverlayOpen || isActive;
            const supportRowClass = clsx(
              "flex min-h-11 w-full items-stretch gap-0.5 rounded-2xl px-1 py-0.5 transition-all active:scale-[0.99]",
              supportActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground md:hover:bg-card/70 md:hover:text-foreground",
            );
            const unreadBadge =
              unreadReplies > 0 ? (
                <span className="ml-auto inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-foreground">
                  {unreadReplies > 9 ? "9+" : unreadReplies}
                </span>
              ) : null;

            return (
              <div key={item.href}>
                <Link
                  href="/dashboard/support"
                  className={clsx(supportRowClass, "hidden md:flex md:items-center")}
                >
                  <span className="flex min-h-11 flex-1 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium">
                    <SafeLucideIcon icon={item.icon} className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {unreadBadge}
                  </span>
                </Link>
                <div className={clsx(supportRowClass, "md:hidden")}>
                  <button
                    type="button"
                    onClick={() => onOpenSupport?.("default")}
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium"
                  >
                    <SafeLucideIcon icon={item.icon} className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                  {unreadReplies > 0 ? (
                    <button
                      type="button"
                      onClick={() => onOpenSupport?.("unread")}
                      className="inline-flex min-h-11 min-w-[2.75rem] shrink-0 items-center justify-center self-center rounded-xl bg-primary px-2 text-xs font-bold text-foreground shadow-sm"
                      aria-label={`${unreadReplies} ungelesene Support-Antworten anzeigen`}
                    >
                      {unreadReplies > 9 ? "9+" : unreadReplies}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex min-h-11 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all active:scale-95",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground md:hover:bg-card/70 md:hover:text-foreground"
              )}
            >
              <SafeLucideIcon icon={item.icon} className="h-4 w-4 shrink-0" />
              {item.label}
              {item.href === "/dashboard/planning" && canManageTrades && pendingTradeApprovals > 0 ? (
                <span
                  className="ml-auto inline-flex h-2.5 w-2.5 rounded-full bg-amber-500"
                  title={`${pendingTradeApprovals} Tauschanfragen warten`}
                />
              ) : null}
              {item.href === "/dashboard/super-admin/tickets" && openSuperTickets > 0 ? (
                <span
                  className="ml-auto inline-flex h-2.5 w-2.5 rounded-full bg-red-500"
                  title={`${openSuperTickets} offene Tickets`}
                />
              ) : null}
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

export function DashboardMobileBottomNav({
  role,
  companyModules,
  planVocabulary,
  className,
}: {
  role: string;
  companyModules: CompanyModules;
  planVocabulary?: Pick<VocabularyLabels, "plural" | "planTitle">;
  className?: string;
}) {
  const pathname = usePathname();
  const items = getMobileBottomNavItems(role, companyModules, planVocabulary);

  return (
    <nav
      className={clsx(
        "fixed bottom-0 left-0 right-0 z-50 w-full max-w-full overflow-x-hidden border-t border-white/40 bg-white/80 px-1 pt-1 shadow-[0_-8px_28px_rgba(0,0,0,0.08)] backdrop-blur-md dark:border-white/10 dark:bg-background/80 md:hidden pb-safe",
        className,
      )}
      aria-label="Hauptnavigation"
    >
      <div
        className={clsx(
          "mx-auto grid w-full min-w-0 max-w-lg gap-0.5 overflow-hidden",
          items.length === 2 ? "grid-cols-2" : "grid-cols-5",
        )}
      >
        {items.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex min-h-[3.5rem] flex-col items-center justify-center gap-0 rounded-xl px-0.5 py-1 transition-transform duration-100 active:scale-95 min-[400px]:min-h-[3.75rem] min-[400px]:rounded-2xl",
                isActive
                  ? "bg-brand/15 text-brand ring-1 ring-inset ring-brand/25"
                  : "text-muted-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <SafeLucideIcon
                icon={item.icon}
                className={clsx("h-6 w-6 shrink-0 stroke-[1.75]", isActive && "text-brand")}
              />
              <span className={clsx("mt-0.5 text-[10px] font-bold leading-tight", isActive && "text-brand")}>
                {item.label}
              </span>
              <span className="mt-0.5 hidden text-[8px] font-medium leading-none opacity-80 min-[400px]:block">
                {item.subtitle}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
