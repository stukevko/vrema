"use client";

import { Bell, ChevronDown, LogOut, Settings, UserCircle2 } from "lucide-react";
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
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-6 bg-card/95 backdrop-blur-md sticky top-0 z-50">
      <div />
      <div className="flex items-center gap-3">
        {user.role === "SUPER_ADMIN" && (
          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-200">
            Super Admin
          </span>
        )}
        <button className="relative w-11 h-11 rounded-2xl bg-card border border-border md:hover:bg-card/70 flex items-center justify-center transition-all active:scale-95">
          <Bell className="w-4 h-4 text-white/60" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
        </button>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-2xl border border-border bg-card px-2 py-1.5 md:hover:bg-card/70 transition-all active:scale-95"
          >
            <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
              {initials}
            </div>
            <ChevronDown className="w-4 h-4 text-white/50" />
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-52 rounded-2xl border border-white/5 bg-card p-1 shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-30">
              <div className="px-3 py-2 border-b border-border mb-1">
                <p className="text-sm font-semibold truncate">{user.name ?? "Profil"}</p>
                <p className="text-xs text-white/40 truncate">{user.email ?? ""}</p>
              </div>

              <Link
                href="/dashboard/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/80 md:hover:bg-card/70 transition-all active:scale-95"
              >
                <UserCircle2 className="w-4 h-4" />
                Profil
              </Link>
              <Link
                href="/dashboard/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/80 md:hover:bg-card/70 transition-all active:scale-95"
              >
                <Settings className="w-4 h-4" />
                Einstellungen
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-300 md:hover:bg-red-500/10 transition-all active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                Abmelden
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
