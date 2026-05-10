"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { approveVacation, rejectVacation, type VacationDecisionContext } from "@/lib/actions/vacation";
import { Check, X, Clock, AlertTriangle, Users, ShieldCheck, Loader2, Info } from "lucide-react";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";

type VacationRequest = {
  id: string;
  absenceType?: "VACATION" | "SICK" | "OTHER";
  startDate: Date | string;
  endDate: Date | string;
  days: number;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  userName?: string;
  approvedBy?: { name: string | null } | null;
  /** Persistierter Kommentar/Begründung vom Genehmiger (Task 3). */
  decisionNote?: string | null;
  /** Nur in Manager-Sicht (Team-Anträge): Resturlaub & Konflikte */
  context?: VacationDecisionContext;
};

interface VacationListProps {
  requests: VacationRequest[];
  canApprove: boolean;
}

const STATUS_TONES: Record<VacationRequest["status"], StatusTone> = {
  PENDING: "warning",
  APPROVED: "brand",
  REJECTED: "danger",
};

const STATUS_LABELS: Record<VacationRequest["status"], string> = {
  PENDING: "Ausstehend",
  APPROVED: "Genehmigt",
  REJECTED: "Abgelehnt",
};

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("de-DE");
}

function remainingTone(remaining: number, requested: number): "positive" | "tight" | "over" {
  const after = remaining - requested;
  if (after < 0) return "over";
  if (after <= 3) return "tight";
  return "positive";
}

const REMAINING_CONTAINER: Record<"positive" | "tight" | "over", string> = {
  positive:
    "border-brand/30 bg-brand-soft/85 text-brand backdrop-blur-md dark:border-white/10 dark:bg-brand/22 dark:text-brand-foreground",
  tight:
    "border-warning/30 bg-warning-soft/85 text-warning-foreground backdrop-blur-md dark:border-white/10 dark:bg-warning/22",
  over: "border-danger/35 bg-danger-soft/85 text-danger-foreground backdrop-blur-md dark:border-white/10 dark:bg-danger/22",
};

export function VacationList({ requests, canApprove }: VacationListProps) {
  const [isPending, startTransition] = useTransition();
  const [decision, setDecision] = useState<{ id: string; mode: "APPROVE" | "REJECT"; note: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toasts, show, remove } = useToast();

  const submitDecision = () => {
    if (!decision) return;
    setError(null);
    const note = decision.note.trim();
    if (decision.mode === "REJECT" && note.length < 3) {
      setError("Bitte mindestens eine kurze Begründung angeben (≥ 3 Zeichen).");
      return;
    }
    startTransition(async () => {
      try {
        if (decision.mode === "APPROVE") {
          await approveVacation(decision.id, { note: note || undefined });
          show("Antrag genehmigt – Mitarbeiter wurde per E-Mail informiert.", "success");
        } else {
          await rejectVacation(decision.id, { note });
          show("Antrag abgelehnt – Begründung wurde in der E-Mail mitgeschickt.", "success");
        }
        setDecision(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Aktion konnte nicht abgeschlossen werden.");
      }
    });
  };

  if (requests.length === 0) {
    return (
      <>
        <div className="glass-card p-8 text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" aria-hidden />
          <p className="text-sm font-medium text-foreground">Keine Anträge in dieser Liste</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {canApprove
              ? "Sobald Teammitglieder Anträge stellen, erscheinen sie hier."
              : "Nutzen Sie das Antragsformular auf dieser Seite — Zeitraum und Grund genügen."}
          </p>
        </div>
        <ToastContainer toasts={toasts} remove={remove} />
      </>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {requests.map((req, i) => {
          const isOpen = decision?.id === req.id;
          const ctx = req.context;
          const showApprovals = canApprove && req.status === "PENDING";
          const tone =
            ctx && req.absenceType !== "SICK" ? remainingTone(ctx.daysRemaining, req.days) : "positive";

          return (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass-card p-5 transition-all sm:p-6 ${
                isOpen ? "ring-2 ring-brand/30" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {req.userName && (
                    <p className="mb-1 text-sm font-semibold">{req.userName}</p>
                  )}
                  <p className="text-sm text-foreground">
                    {formatDate(req.startDate)} – {formatDate(req.endDate)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {req.days} Tage · {req.absenceType === "SICK" ? "Krank" : req.absenceType === "OTHER" ? "Abwesenheit" : "Urlaub"}
                  </p>
                  {req.reason && (
                    <p
                      className={`mt-1 truncate text-xs ${
                        req.absenceType === "SICK" ? "text-danger-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {req.reason}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StatusBadge tone={STATUS_TONES[req.status]} glass size="sm">
                    {STATUS_LABELS[req.status]}
                  </StatusBadge>
                  {req.approvedBy?.name && req.status !== "PENDING" ? (
                    <span className="text-[11px] text-muted-foreground">durch {req.approvedBy.name}</span>
                  ) : null}
                </div>
              </div>

              {/* Entscheidungs-Kontext: nur Manager-Sicht & nur für Urlaub (nicht Krank) */}
              {ctx && req.absenceType !== "SICK" && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${REMAINING_CONTAINER[tone]}`}
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
                    <span>
                      <strong>{ctx.daysRemaining}</strong> / {ctx.vacationDays} Tage Resturlaub
                      {req.status === "PENDING" ? (
                        <>
                          {" · nach Freigabe noch "}
                          <strong>{ctx.daysRemaining - req.days}</strong>
                        </>
                      ) : null}
                    </span>
                  </div>

                  {req.status === "PENDING" && ctx.conflicts.length > 0 ? (
                    <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-soft/85 px-3 py-2 text-xs text-warning-foreground backdrop-blur-md dark:border-white/10 dark:bg-warning/22">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <span>
                        <strong>{ctx.conflicts.length}</strong>{" "}
                        {ctx.conflicts.length === 1 ? "Kolleg:in" : "Kolleg:innen"} im selben Zeitraum bereits abwesend
                        {ctx.conflicts.some((c) => c.sameRole)
                          ? " (dabei gleiche Rolle!)"
                          : ""}
                        :
                        <span className="ml-1 font-semibold">
                          {ctx.conflicts
                            .slice(0, 4)
                            .map((c) => `${c.name}${c.sameRole ? " ★" : ""}`)
                            .join(", ")}
                          {ctx.conflicts.length > 4 ? ` … +${ctx.conflicts.length - 4}` : ""}
                        </span>
                      </span>
                    </div>
                  ) : req.status === "PENDING" ? (
                    <div className="flex items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft/85 px-3 py-2 text-xs text-brand backdrop-blur-md dark:border-white/10 dark:bg-brand/22 dark:text-brand-foreground">
                      <Users className="h-4 w-4 shrink-0" aria-hidden />
                      <span>Im Zeitraum sind keine Kolleg:innen abwesend.</span>
                    </div>
                  ) : null}
                </div>
              )}

              {req.decisionNote?.trim() && req.status !== "PENDING" ? (
                <div className="mt-3 flex gap-2 rounded-xl border border-line bg-surface-muted/80 px-3 py-2 text-[11px] text-foreground backdrop-blur dark:border-white/10 dark:bg-surface-muted/40">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                  <p title={req.decisionNote}>
                    <span className="font-semibold">Entscheidung vom Chef:</span>{" "}
                    <span className="whitespace-pre-wrap">{req.decisionNote}</span>
                  </p>
                </div>
              ) : null}

              {/* Buttons → Confirm-Panel */}
              {showApprovals && !isOpen && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="brand"
                    size="md"
                    disabled={isPending}
                    leadingIcon={<Check className="h-4 w-4" />}
                    onClick={() => {
                      setError(null);
                      setDecision({ id: req.id, mode: "APPROVE", note: "" });
                    }}
                  >
                    Genehmigen
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    disabled={isPending}
                    leadingIcon={<X className="h-4 w-4" />}
                    onClick={() => {
                      setError(null);
                      setDecision({ id: req.id, mode: "REJECT", note: "" });
                    }}
                    className="border-danger/40 text-danger-foreground hover:border-danger/60 hover:bg-danger-soft/70 hover:text-danger-foreground"
                  >
                    Ablehnen
                  </Button>
                </div>
              )}

              <AnimatePresence>
                {isOpen && decision && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div
                      className={`mt-4 rounded-xl border p-4 backdrop-blur-md ${
                        decision.mode === "APPROVE"
                          ? "border-brand/30 bg-brand-soft/70 dark:border-white/10 dark:bg-brand/18"
                          : "border-danger/30 bg-danger-soft/70 dark:border-white/10 dark:bg-danger/18"
                      }`}
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {decision.mode === "APPROVE" ? "Antrag wirklich genehmigen?" : "Antrag wirklich ablehnen?"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {decision.mode === "APPROVE"
                          ? "Optionale Anmerkung wird in der Bestätigungs-E-Mail mitgeschickt."
                          : "Pflicht: Begründung wird dem Mitarbeiter per E-Mail mitgeteilt."}
                      </p>
                      <textarea
                        value={decision.note}
                        onChange={(e) =>
                          setDecision((d) => (d ? { ...d, note: e.target.value } : d))
                        }
                        placeholder={
                          decision.mode === "APPROVE"
                            ? "Optionale Anmerkung (z. B. Übergabe an Kolleg:in planen)"
                            : "Begründung für die Ablehnung (Pflicht)"
                        }
                        rows={3}
                        className="mt-3 w-full resize-y rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                        autoFocus
                      />
                      {error ? (
                        <p className="mt-2 text-xs font-medium text-danger-foreground">{error}</p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant={decision.mode === "APPROVE" ? "brand" : "danger"}
                          size="md"
                          disabled={isPending}
                          loading={isPending}
                          leadingIcon={
                            isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : decision.mode === "APPROVE" ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <X className="h-4 w-4" />
                            )
                          }
                          onClick={submitDecision}
                        >
                          {isPending
                            ? "Speichere…"
                            : decision.mode === "APPROVE"
                              ? "Genehmigen & benachrichtigen"
                              : "Ablehnen & benachrichtigen"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="md"
                          onClick={() => {
                            setDecision(null);
                            setError(null);
                          }}
                          disabled={isPending}
                        >
                          Abbrechen
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
      <ToastContainer toasts={toasts} remove={remove} />
    </>
  );
}
