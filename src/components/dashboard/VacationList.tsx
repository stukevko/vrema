"use client";

import { useTransition } from "react";
import { motion } from "framer-motion";
import { approveVacation, rejectVacation } from "@/lib/actions/vacation";
import { Check, X, Clock } from "lucide-react";

type VacationRequest = {
  id: string;
  absenceType?: "VACATION" | "SICK";
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  userName?: string;
  approvedBy?: { name: string | null } | null;
};

interface VacationListProps {
  requests: VacationRequest[];
  canApprove: boolean;
}

const STATUS_STYLES = {
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  APPROVED: "bg-primary/10 text-primary border-primary/20",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_LABELS = {
  PENDING: "Ausstehend",
  APPROVED: "Genehmigt",
  REJECTED: "Abgelehnt",
};

export function VacationList({ requests, canApprove }: VacationListProps) {
  const [isPending, startTransition] = useTransition();

  if (requests.length === 0) {
    return (
      <div className="rounded-3xl bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-xl p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
        <Clock className="w-8 h-8 text-slate-400 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Keine Urlaubsanträge vorhanden.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req, i) => (
        <motion.div
          key={req.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-2xl bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {req.userName && (
                <p className="text-sm font-semibold mb-1">{req.userName}</p>
              )}
              <p className="text-sm text-foreground">
                {new Date(req.startDate).toLocaleDateString("de-DE")} –{" "}
                {new Date(req.endDate).toLocaleDateString("de-DE")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {req.days} Tage · {req.absenceType === "SICK" ? "Krank" : "Urlaub"}
              </p>
              {req.reason && (
                <p className={`text-xs mt-1 truncate ${req.absenceType === "SICK" ? "text-red-700" : "text-muted-foreground"}`}>
                  {req.reason}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_STYLES[req.status]}`}>
                {STATUS_LABELS[req.status]}
              </span>
              {canApprove && req.status === "PENDING" && (
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={isPending}
                    onClick={() => startTransition(async () => { await approveVacation(req.id); })}
                    className="w-7 h-7 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
                  >
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() => startTransition(async () => { await rejectVacation(req.id); })}
                    className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
