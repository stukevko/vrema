"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import clsx from "clsx";
import { groupDashboardNavItems, type DashboardNavItem } from "./dashboard-nav-config";
import { SafeLucideIcon } from "@/lib/icons/safe-lucide";

type Props = {
  items: DashboardNavItem[];
  onOpenSupport?: (mode?: "default" | "unread") => void;
  supportOverlayOpen?: boolean;
  unreadReplies?: number;
  openSuperTickets?: number;
  pendingTradeApprovals?: number;
  canManageTrades?: boolean;
};

export function DashboardMoreNavDrawer({
  items,
  onOpenSupport,
  supportOverlayOpen = false,
  unreadReplies = 0,
  openSuperTickets = 0,
  pendingTradeApprovals = 0,
  canManageTrades = false,
}: Props) {
  const pathname = usePathname();
  const groups = groupDashboardNavItems(items);

  const isItemActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const hasActiveSecondary = items.some((item) => isItemActive(item.href));
  const showBadge = hasActiveSecondary || unreadReplies > 0 || openSuperTickets > 0;
  const [expanded, setExpanded] = useState(hasActiveSecondary);

  useEffect(() => {
    if (hasActiveSecondary) setExpanded(true);
  }, [hasActiveSecondary, pathname]);

  function renderNavItem(item: DashboardNavItem, nested = false) {
    const active = isItemActive(item.href);
    const itemClass = clsx(
      "flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
      nested ? "pl-3" : "px-4 py-3 min-h-11 rounded-2xl",
      active
        ? "bg-muted text-foreground"
        : "text-muted-foreground md:hover:bg-card/70 md:hover:text-foreground",
    );

    if (item.href === "/dashboard/support") {
      return (
        <button
          key={item.href}
          type="button"
          onClick={() => onOpenSupport?.("default")}
          className={itemClass}
        >
          <SafeLucideIcon icon={item.icon} className="h-4 w-4 shrink-0" />
          <span className="truncate">{item.label}</span>
          {unreadReplies > 0 ? (
            <span className="ml-auto inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-brand-foreground">
              {unreadReplies > 9 ? "9+" : unreadReplies}
            </span>
          ) : null}
        </button>
      );
    }

    return (
      <Link key={item.href} href={item.href} className={itemClass}>
        <SafeLucideIcon icon={item.icon} className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label}</span>
        {item.href === "/dashboard/planning" && canManageTrades && pendingTradeApprovals > 0 ? (
          <span
            className="ml-auto inline-flex h-2 w-2 rounded-full bg-amber-500"
            title={`${pendingTradeApprovals} Tauschanfragen warten`}
          />
        ) : null}
        {item.href === "/dashboard/super-admin/tickets" && openSuperTickets > 0 ? (
          <span
            className="ml-auto inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
            title={`${openSuperTickets} offene Tickets`}
          >
            {openSuperTickets > 9 ? "9+" : openSuperTickets}
          </span>
        ) : null}
      </Link>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={clsx(
          "flex min-h-11 w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all active:scale-[0.99]",
          expanded || hasActiveSecondary
            ? "bg-muted text-foreground"
            : "text-muted-foreground md:hover:bg-card/70 md:hover:text-foreground",
        )}
        aria-expanded={expanded}
      >
        <MoreHorizontal className="h-4 w-4 shrink-0" aria-hidden />
        <span className="flex-1 text-left">Mehr</span>
        {showBadge && !expanded ? (
          <span className="inline-flex h-2 w-2 rounded-full bg-brand" aria-hidden />
        ) : null}
        <ChevronDown
          className={clsx("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div
          className="ml-3 space-y-3 border-l border-border/80 py-1 pl-3"
          role="region"
          aria-label="Weitere Navigation"
        >
          {groups.map((group) => (
            <div key={group.label}>
              {groups.length > 1 ? (
                <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                  {group.label}
                </p>
              ) : null}
              <div className="space-y-0.5">{group.items.map((item) => renderNavItem(item, true))}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
