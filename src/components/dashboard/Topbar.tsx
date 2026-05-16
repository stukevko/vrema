"use client";

import { ChevronDown, LifeBuoy, LogOut, Settings, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { getPersonalAccountHref } from "@/lib/dashboard/account-href";
import clsx from "clsx";
import { VremaMarkLogo } from "@/components/brand/VremaMarkLogo";

interface TopbarProps {
  className?: string;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  };
  unreadNotifications?: number;
  /** Mobil: Support-Overlay öffnen (Bottom-Nav hat keinen Support-Tab mehr). */
  onOpenSupport?: (mode?: "default" | "unread") => void;
  unreadSupportReplies?: number;
}

export function DashboardTopbar({
  className,
  user,
  unreadNotifications = 0,
  onOpenSupport,
  unreadSupportReplies = 0,
}: TopbarProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const accountHref = getPersonalAccountHref(user.role);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? "?";

  return (
    <header
      className={clsx(
        "fixed inset-x-0 top-0 z-[60] w-full max-w-full overflow-x-hidden border-b border-white/40 bg-background/85 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md dark:border-white/8 dark:bg-background/75 md:relative md:inset-auto md:z-30 md:overflow-visible md:border-b-0 md:bg-transparent md:pt-0 md:backdrop-blur-0",
        className,
      )}
    >
      <div className="relative flex h-16 min-w-0 items-center justify-between gap-2 px-3 sm:px-4 md:px-6">
        <div className="relative z-10 flex w-11 shrink-0 items-center md:hidden">
          {onOpenSupport ? (
            <button
              type="button"
              onClick={() => onOpenSupport("default")}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-surface text-fg-muted transition-colors active:scale-95 md:hover:bg-surface-muted"
              aria-label="Hilfe und Support"
            >
              <LifeBuoy className="h-5 w-5 shrink-0" aria-hidden />
              {unreadSupportReplies > 0 ? (
                <span
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background"
                  aria-hidden
                />
              ) : null}
            </button>
          ) : (
            <span className="block h-11 w-11 shrink-0" aria-hidden />
          )}
        </div>

        <Link
          href="/dashboard"
          className="absolute left-1/2 top-1/2 z-[1] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2 md:hidden"
          aria-label="VREMA"
        >
          <VremaMarkLogo size={28} className="shrink-0 text-foreground" />
          <span className="hidden font-bold tracking-tighter text-foreground sm:block" style={{ fontSize: 17 }}>
            VREMA
          </span>
        </Link>

        <div className="hidden md:block md:flex-1" />

        <div className="relative z-10 flex min-w-0 max-w-[48%] shrink-0 items-center justify-end gap-2 sm:max-w-none sm:gap-3">
          {user.role === "SUPER_ADMIN" && (
            <span className="hidden rounded-full border border-warning/30 bg-warning-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-warning-foreground sm:inline-flex">
              Super Admin
            </span>
          )}
          <ThemeToggle />
          <NotificationBell initialUnread={unreadNotifications} />
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              aria-expanded={open}
              aria-haspopup="menu"
              aria-controls="dashboard-user-menu"
              onClick={() => setOpen((prev) => !prev)}
              className="flex min-h-12 items-center gap-2 rounded-2xl border border-line bg-surface px-2 py-1.5 transition-all active:scale-95 md:hover:bg-surface-muted md:min-h-0"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-soft text-xs font-bold text-brand">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- OAuth-URLs & /api/user-avatar
                  <img src={user.image} alt="" className="h-full w-full object-cover" width={36} height={36} />
                ) : (
                  initials
                )}
              </div>
              <ChevronDown className="hidden h-4 w-4 text-fg-muted sm:block" />
            </button>

            {open && (
              <div
                id="dashboard-user-menu"
                role="menu"
                className="absolute right-0 top-[calc(100%+0.25rem)] z-[100] w-56 rounded-2xl glass-panel p-1 shadow-lg"
              >
                <div className="mb-1 border-b border-line px-3 py-2">
                  <p className="truncate text-sm font-semibold text-fg">{user.name ?? "Profil"}</p>
                  <p className="truncate text-xs text-fg-muted">{user.email ?? ""}</p>
                </div>

                <Link
                  href={accountHref}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm text-fg transition-all active:scale-95 md:hover:bg-surface-muted"
                >
                  <UserCircle2 className="h-4 w-4 shrink-0" />
                  Profil
                </Link>
                <Link
                  href={accountHref}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm text-fg transition-all active:scale-95 md:hover:bg-surface-muted"
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  {user.role === "EMPLOYEE" ? "Mein Konto" : "Einstellungen"}
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm text-danger transition-all active:scale-95 md:hover:bg-danger-soft"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  Abmelden
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
