"use client";

import { Bell, ChevronDown, LogOut, Settings, UserCircle2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

interface TopbarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  };
}

export function DashboardTopbar({ user }: TopbarProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <header className="glass-nav fixed inset-x-0 top-0 z-[60] overflow-visible border-b border-border pt-[env(safe-area-inset-top,0px)] md:relative md:inset-auto md:z-30 md:pt-0">
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
            <span className="hidden rounded-full border border-amber-300/40 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700 sm:inline-flex">
              Super Admin
            </span>
          )}
          <button
            type="button"
            className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-white/90 shadow-sm transition-all active:scale-95 md:hover:bg-card/70 md:h-11 md:w-11"
            aria-label="Benachrichtigungen"
          >
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
          </button>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              aria-expanded={open}
              aria-haspopup="menu"
              aria-controls="dashboard-user-menu"
              onClick={() => setOpen((prev) => !prev)}
              className="flex min-h-12 items-center gap-2 rounded-2xl border border-border bg-white px-2 py-1.5 transition-all active:scale-95 md:hover:bg-card/70 md:min-h-0"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15 text-xs font-bold text-primary">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- OAuth-URLs & /api/user-avatar
                  <img src={user.image} alt="" className="h-full w-full object-cover" width={36} height={36} />
                ) : (
                  initials
                )}
              </div>
              <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
            </button>

            {open && (
              <div
                id="dashboard-user-menu"
                role="menu"
                className="absolute right-0 top-[calc(100%+0.25rem)] z-[100] w-56 rounded-2xl glass-panel p-1 shadow-lg"
              >
                <div className="mb-1 border-b border-border px-3 py-2">
                  <p className="truncate text-sm font-semibold">{user.name ?? "Profil"}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email ?? ""}</p>
                </div>

                <Link
                  href="/dashboard/settings"
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm text-foreground transition-all active:scale-95 md:hover:bg-card/70"
                >
                  <UserCircle2 className="h-4 w-4 shrink-0" />
                  Profil
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm text-foreground transition-all active:scale-95 md:hover:bg-card/70"
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  Einstellungen
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm text-red-600 transition-all active:scale-95 md:hover:bg-red-50"
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
