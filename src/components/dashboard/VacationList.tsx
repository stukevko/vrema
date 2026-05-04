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
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" aria-hidden />
        <p className="text-sm font-medium text-foreground">Keine Anträge in dieser Liste</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {canApprove
            ? "Sobald Teammitglieder Anträge stellen, erscheinen sie hier."
            : "Nutzen Sie das Antragsformular auf dieser Seite — Zeitraum und Grund genügen."}
        </p>
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
          className="rounded-2xl border border-border bg-card p-5 shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-xl sm:p-6"
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startTransition(async () => { await approveVacation(req.id); })}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 transition-colors hover:bg-primary/20"
                    aria-label="Genehmigen"
                  >
                    <Check className="h-4 w-4 text-primary" />
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startTransition(async () => { await rejectVacation(req.id); })}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 transition-colors hover:bg-red-500/20"
                    aria-label="Ablehnen"
                  >
                    <X className="h-4 w-4 text-red-400" />
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
