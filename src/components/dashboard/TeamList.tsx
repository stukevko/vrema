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
  EMPLOYEE: { label: "Mitarbeiter", Icon: User, color: "text-white/40" },
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
      <div className="rounded-2xl bg-card border border-border p-10 text-center">
        <User className="w-8 h-8 text-white/20 mx-auto mb-3" />
        <p className="text-sm text-white/30">Noch keine Mitarbeiter vorhanden.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      {/* Header row */}
      <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-white/5 text-xs text-white/30 font-sans uppercase tracking-widest">
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
                "grid grid-cols-12 gap-3 px-5 py-4 items-center transition-colors hover:bg-white/[0.02]",
                !member.isActive && "opacity-40"
              )}
            >
              {/* Avatar + name */}
              <div className="col-span-5 flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-sm font-bold text-white/60 shrink-0">
                  {(member.name ?? member.email)[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.name ?? "–"}
                    {isSelf && <span className="ml-2 text-[10px] text-white/30 font-sans">(du)</span>}
                  </p>
                  <p className="text-xs text-white/30 truncate">{member.email}</p>
                </div>
              </div>

              {/* Role */}
              <div className="col-span-3 flex items-center gap-1.5">
                <meta.Icon className={clsx("w-3.5 h-3.5 shrink-0", meta.color)} />
                <span className={clsx("text-xs font-sans", meta.color)}>{meta.label}</span>
              </div>

              {/* Weekly hours */}
              <div className="col-span-2 text-right">
                <span className="text-sm font-sans text-white/60">{member.weeklyHours}h</span>
              </div>

              {/* Actions */}
              <div className="col-span-2 flex justify-end">
                {canManage && !isSelf && (
                  <button
                    disabled={isPending}
                    onClick={() => startTransition(async () => { await toggleEmployeeActive(member.id); })}
                    title={member.isActive ? "Deaktivieren" : "Aktivieren"}
                    className={clsx(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                      member.isActive
                        ? "bg-red-500/10 hover:bg-red-500/20 text-red-400"
                        : "bg-primary/10 hover:bg-primary/20 text-primary"
                    )}
                  >
                    {member.isActive
                      ? <PowerOff className="w-3.5 h-3.5" />
                      : <Power className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
