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
    <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0b0b0b]/80 backdrop-blur sticky top-0 z-20">
      <div />
      <div className="flex items-center gap-3">
        {user.role === "SUPER_ADMIN" && (
          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-200">
            Super Admin
          </span>
        )}
        <button className="relative w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
          <Bell className="w-4 h-4 text-white/60" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
        </button>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 hover:bg-white/10 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-[#22c55e]/20 flex items-center justify-center text-xs font-bold text-[#22c55e]">
              {initials}
            </div>
            <ChevronDown className="w-4 h-4 text-white/50" />
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-52 rounded-xl border border-white/10 bg-[#121212] p-1 shadow-2xl z-30">
              <div className="px-3 py-2 border-b border-white/5 mb-1">
                <p className="text-sm font-semibold truncate">{user.name ?? "Profil"}</p>
                <p className="text-xs text-white/40 truncate">{user.email ?? ""}</p>
              </div>

              <Link
                href="/dashboard/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5"
              >
                <UserCircle2 className="w-4 h-4" />
                Profil
              </Link>
              <Link
                href="/dashboard/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5"
              >
                <Settings className="w-4 h-4" />
                Einstellungen
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10"
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
