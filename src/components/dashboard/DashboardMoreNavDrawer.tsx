"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Drawer } from "vaul";
import { MoreHorizontal } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const groups = groupDashboardNavItems(items);

  const isItemActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const hasActiveSecondary = items.some((item) => isItemActive(item.href));
  const showBadge = hasActiveSecondary || unreadReplies > 0 || openSuperTickets > 0;

  function renderDrawerItem(item: DashboardNavItem) {
    const active = isItemActive(item.href);

    if (item.href === "/dashboard/support") {
      return (
        <button
          key={item.href}
          type="button"
          onClick={() => {
            setOpen(false);
            onOpenSupport?.("default");
          }}
          className={clsx(
            "flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition-colors",
            supportOverlayOpen || active
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-card/80 hover:text-foreground",
          )}
        >
          <SafeLucideIcon icon={item.icon} className="h-4 w-4 shrink-0" />
          <span className="truncate">{item.label}</span>
          {unreadReplies > 0 ? (
            <span className="ml-auto inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-foreground">
              {unreadReplies > 9 ? "9+" : unreadReplies}
            </span>
          ) : null}
        </button>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        className={clsx(
          "flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
          active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-card/80 hover:text-foreground",
        )}
      >
        <SafeLucideIcon icon={item.icon} className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label}</span>
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
  }

  if (items.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          "relative flex min-h-11 w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all active:scale-95",
          hasActiveSecondary
            ? "bg-muted text-foreground"
            : "text-muted-foreground md:hover:bg-card/70 md:hover:text-foreground",
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4 shrink-0" aria-hidden />
        Mehr
        {showBadge ? (
          <span className="ml-auto inline-flex h-2 w-2 rounded-full bg-brand" aria-hidden />
        ) : null}
      </button>

      <Drawer.Root open={open} onOpenChange={setOpen} repositionInputs fixed shouldScaleBackground={false}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[101] bg-black/45" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[102] mx-auto flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-[28px] border border-border bg-card outline-none md:inset-x-auto md:bottom-auto md:left-4 md:top-20 md:max-h-[min(32rem,calc(100vh-6rem))] md:rounded-3xl md:shadow-[var(--shadow-pop)]">
            <Drawer.Handle className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/35 md:hidden" />
            <div className="border-b border-border px-5 pb-3 pt-4">
              <Drawer.Title className="text-lg font-semibold text-foreground">Weitere Bereiche</Drawer.Title>
              <Drawer.Description className="mt-0.5 text-sm text-muted-foreground">
                Urlaub, Berichte, Einstellungen und mehr.
              </Drawer.Description>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {groups.map((group) => (
                <div key={group.label} className="mb-4 last:mb-0">
                  <p className="mb-1 px-3 text-xs font-medium text-muted-foreground">{group.label}</p>
                  <div className="space-y-0.5">{group.items.map((item) => renderDrawerItem(item))}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-border p-3">
              <Drawer.Close className="flex min-h-11 w-full items-center justify-center rounded-2xl border border-border bg-background text-sm font-semibold text-foreground active:bg-muted/40">
                Schließen
              </Drawer.Close>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
