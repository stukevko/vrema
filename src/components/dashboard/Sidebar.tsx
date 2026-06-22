"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import clsx from "clsx";
import {
  getEmployeeMobileMoreNavItems,
  getManagerMobileMoreNavItems,
  getMobileBottomNavItems,
  splitDashboardSidebarNav,
  type DashboardNavItem,
  type MobileBottomNavItem,
} from "./dashboard-nav-config";
import { Drawer } from "vaul";
import { DashboardMoreNavDrawer } from "./DashboardMoreNavDrawer";
import type { CompanyModules } from "@/lib/company-modules";
import type { VocabularyLabels } from "@/lib/vocabulary";
import { useEffect, useState } from "react";
import { countOpenSupportTicketsForSuperAdmin } from "@/lib/actions/support";
import { countPendingShiftTradeApprovals } from "@/lib/actions/team";
import { VremaLockup } from "@/components/brand/VremaMarkLogo";
import { SafeLucideIcon } from "@/lib/icons/safe-lucide";

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
  const { primary, secondary } = splitDashboardSidebarNav(role, plan, companyModules);
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

  function renderPrimaryItem(item: DashboardNavItem) {
    const isActive =
      pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

    return (
      <Link
        key={item.href}
        href={item.href}
        className={clsx(
          "flex min-h-11 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all active:scale-95",
          isActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground md:hover:bg-card/70 md:hover:text-foreground",
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
      </Link>
    );
  }

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
        <p className="mt-2.5 max-w-[16rem] text-center text-xs text-muted-foreground">
          Zeiterfassung & Planung
        </p>
      </Link>

      <div className="px-5 pt-5">
        <div className="rounded-2xl border border-border bg-muted/40 px-4 py-1.5 text-xs font-medium capitalize text-foreground">
          {plan} Plan
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-5" aria-label="Hauptnavigation">
        {primary.map((item) => renderPrimaryItem(item))}
        {secondary.length > 0 ? (
          <>
            <div className="my-3 border-t border-border" />
            <DashboardMoreNavDrawer
              items={secondary}
              onOpenSupport={onOpenSupport}
              supportOverlayOpen={supportOverlayOpen}
              unreadReplies={unreadReplies}
              openSuperTickets={openSuperTickets}
              pendingTradeApprovals={pendingTradeApprovals}
              canManageTrades={canManageTrades}
            />
          </>
        ) : null}
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

function MobileNavTab({
  item,
  isActive,
  onMore,
}: {
  item: MobileBottomNavItem;
  isActive: boolean;
  onMore?: () => void;
}) {
  const tabClass = clsx(
    "flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-0.5 transition-colors active:opacity-80",
    isActive ? "text-brand" : "text-muted-foreground",
  );
  const iconClass = clsx("h-5 w-5 shrink-0 stroke-[1.75]", isActive && "text-brand");
  const labelClass = clsx("text-[11px] font-medium leading-none", isActive && "font-semibold text-brand");
  const subtitleClass = clsx(
    "text-[9px] leading-none text-muted-foreground/75",
    isActive && "text-brand/70",
  );

  if (item.kind === "more") {
    return (
      <button
        type="button"
        onClick={onMore}
        className={tabClass}
        aria-haspopup="dialog"
      >
        <SafeLucideIcon icon={item.icon} className={iconClass} />
        <span className={labelClass}>{item.label}</span>
        {item.subtitle ? <span className={subtitleClass}>{item.subtitle}</span> : null}
      </button>
    );
  }

  return (
    <Link key={item.href} href={item.href} className={tabClass} aria-current={isActive ? "page" : undefined}>
      <SafeLucideIcon icon={item.icon} className={iconClass} />
      <span className={labelClass}>{item.label}</span>
      {item.subtitle ? <span className={subtitleClass}>{item.subtitle}</span> : null}
    </Link>
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
  const [moreOpen, setMoreOpen] = useState(false);
  const items = getMobileBottomNavItems(role, companyModules, planVocabulary);
  const moreItems =
    role === "EMPLOYEE"
      ? getEmployeeMobileMoreNavItems()
      : ["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)
        ? getManagerMobileMoreNavItems(role, companyModules)
        : [];
  const morePaths = new Set(moreItems.map((item) => item.href));
  const colCount = items.length <= 2 ? 2 : items.length <= 3 ? 3 : 5;

  return (
    <>
      <nav
        className={clsx(
          "fixed bottom-0 left-0 right-0 z-50 w-full max-w-full overflow-x-hidden glossy-bottom-nav px-2 pt-1.5 md:hidden pb-safe",
          className,
        )}
        aria-label="Hauptnavigation"
      >
        <div
          className={clsx(
            "mx-auto grid w-full min-w-0 max-w-lg gap-0.5 overflow-hidden",
            colCount === 2 ? "grid-cols-2" : colCount === 3 ? "grid-cols-3" : "grid-cols-5",
          )}
        >
          {items.map((item) => {
            const isActive =
              item.kind === "more"
                ? morePaths.has(pathname) || pathname.startsWith("/dashboard/support")
                : pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <MobileNavTab
                key={item.kind === "more" ? "more" : item.href}
                item={item}
                isActive={isActive}
                onMore={() => setMoreOpen(true)}
              />
            );
          })}
        </div>
      </nav>

      {moreItems.length > 0 ? (
        <Drawer.Root open={moreOpen} onOpenChange={setMoreOpen} repositionInputs fixed shouldScaleBackground={false}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-[101] bg-black/45" />
            <Drawer.Content className="fixed inset-x-0 bottom-0 z-[102] flex max-h-[70vh] flex-col rounded-t-[28px] border border-border bg-card outline-none pb-safe">
              <Drawer.Handle className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/35" />
              <div className="border-b border-border px-5 pb-3 pt-2">
                <Drawer.Title className="text-lg font-semibold text-foreground">Mehr</Drawer.Title>
                <Drawer.Description className="text-sm text-muted-foreground">
                  {role === "EMPLOYEE" ? "Team, Abwesenheit und Konto." : "Team, Auswertung, Berichte und Einstellungen."}
                </Drawer.Description>
              </div>
              <div className="space-y-0.5 overflow-y-auto px-3 py-2">
                {moreItems.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={clsx(
                        "flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium",
                        active ? "bg-muted text-foreground" : "text-muted-foreground active:bg-muted/60",
                      )}
                    >
                      <SafeLucideIcon icon={item.icon} className="h-5 w-5 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      ) : null}
    </>
  );
}
