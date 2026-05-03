"use client";

import { useTransition } from "react";
import { motion } from "framer-motion";
import { toggleEmployeeActive } from "@/lib/actions/team";
import { Crown, ShieldCheck, User, PowerOff, Power } from "lucide-react";
import clsx from "clsx";

type Member = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  weeklyHours: number;
  vacationDays: number;
  employeeNumber: string | null;
  createdAt: Date;
};

const ROLE_META: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  SUPER_ADMIN: { label: "Super Admin", Icon: ShieldCheck, color: "text-amber-400" },
  COMPANY_OWNER: { label: "Inhaber", Icon: Crown, color: "text-[#22c55e]" },
  MANAGER: { label: "Manager", Icon: ShieldCheck, color: "text-blue-400" },
  EMPLOYEE: { label: "Mitarbeiter", Icon: User, color: "text-muted-foreground" },
};

export function TeamList({
  members,
  canManage,
  currentUserId,
}: {
  members: Member[];
  canManage: boolean;
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();

  if (members.length === 0) {
    return (
      <div className="rounded-2xl bg-card backdrop-blur-xl border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-10 text-center">
        <User className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Noch keine Mitarbeiter vorhanden.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      {/* Desktop */}
      <div className="hidden sm:block">
        <div className="grid grid-cols-12 gap-3 border-b border-border px-5 py-3 text-xs font-sans uppercase tracking-widest text-muted-foreground">
          <span className="col-span-5">Mitarbeiter</span>
          <span className="col-span-3">Rolle</span>
          <span className="col-span-2 text-right">Std/Woche</span>
          <span className="col-span-2" />
        </div>

        <div className="divide-y divide-white/[0.04]">
          {members.map((member, i) => {
            const meta = ROLE_META[member.role] ?? ROLE_META.EMPLOYEE;
            const isSelf = member.id === currentUserId;

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={clsx(
                  "grid grid-cols-12 items-center gap-3 px-5 py-4 transition-colors hover:bg-white/[0.02]",
                  !member.isActive && "opacity-40"
                )}
              >
                <div className="col-span-5 flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-sm font-bold text-foreground shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-xl">
                    {(member.name ?? member.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {member.name ?? "–"}
                      {isSelf && <span className="ml-2 font-sans text-[10px] text-muted-foreground">(du)</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>

                <div className="col-span-3 flex items-center gap-1.5">
                  <meta.Icon className={clsx("h-3.5 w-3.5 shrink-0", meta.color)} />
                  <span className={clsx("font-sans text-xs", meta.color)}>{meta.label}</span>
                </div>

                <div className="col-span-2 text-right">
                  <span className="font-sans text-sm text-foreground">{member.weeklyHours}h</span>
                </div>

                <div className="col-span-2 flex justify-end">
                  {canManage && !isSelf && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => startTransition(async () => { await toggleEmployeeActive(member.id); })}
                      title={member.isActive ? "Deaktivieren" : "Aktivieren"}
                      className={clsx(
                        "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                        member.isActive
                          ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                      )}
                    >
                      {member.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Mobile: Karten */}
      <div className="space-y-3 p-3 sm:hidden">
        {members.map((member, i) => {
          const meta = ROLE_META[member.role] ?? ROLE_META.EMPLOYEE;
          const isSelf = member.id === currentUserId;

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={clsx(
                "rounded-2xl border border-border bg-card/95 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.06)]",
                !member.isActive && "opacity-40"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-base font-bold text-foreground">
                  {(member.name ?? member.email)[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-foreground">
                    {member.name ?? "–"}
                    {isSelf && <span className="ml-2 text-xs font-normal text-muted-foreground">(du)</span>}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{member.email}</p>
                </div>
                {canManage && !isSelf && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startTransition(async () => { await toggleEmployeeActive(member.id); })}
                    className={clsx(
                      "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-colors active:scale-95",
                      member.isActive
                        ? "border-red-200 bg-red-500/10 text-red-600"
                        : "border-primary/30 bg-primary/10 text-primary"
                    )}
                    aria-label={member.isActive ? "Deaktivieren" : "Aktivieren"}
                  >
                    {member.isActive ? <PowerOff className="h-5 w-5" /> : <Power className="h-5 w-5" />}
                  </button>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3 text-sm">
                <meta.Icon className={clsx("h-4 w-4 shrink-0", meta.color)} />
                <span className={clsx("font-medium", meta.color)}>{meta.label}</span>
                <span className="ml-auto tabular-nums text-foreground">{member.weeklyHours} Std./Woche</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
