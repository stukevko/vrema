"use client";

import { ChevronDown, LogOut, Settings, UserCircle2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { getPersonalAccountHref } from "@/lib/dashboard/account-href";

interface TopbarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  };
  unreadNotifications?: number;
}

export function DashboardTopbar({ user, unreadNotifications = 0 }: TopbarProps) {
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
    <header className="fixed inset-x-0 top-0 z-[60] overflow-visible border-b border-white/40 bg-background/85 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md dark:border-white/8 dark:bg-background/75 md:relative md:inset-auto md:z-30 md:border-b-0 md:bg-transparent md:pt-0 md:backdrop-blur-0">
      <div className="flex h-16 min-w-0 items-center justify-between gap-2 px-3 sm:px-4 md:px-6">
        <Link href="/dashboard" className="shrink-0 md:hidden">
          <Image
            src="/vrema_logo.png"
            alt="VREMA"
            width={160}
            height={44}
            priority
            className="h-8 w-auto max-w-[40vw] object-contain"
          />
        </Link>

        <div className="hidden md:block md:flex-1" />

        <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 sm:gap-3">
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
