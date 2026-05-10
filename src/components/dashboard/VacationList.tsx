"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { approveVacation, rejectVacation, type VacationDecisionContext } from "@/lib/actions/vacation";
import { Check, X, Clock, AlertTriangle, Users, ShieldCheck, Loader2, Info } from "lucide-react";
import { ToastContainer, useToast } from "@/components/ui/Toast";

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

const STATUS_STYLES = {
  PENDING: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  APPROVED: "bg-primary/10 text-primary border-primary/20",
  REJECTED: "bg-red-500/10 text-red-600 border-red-500/20",
};

const STATUS_LABELS = {
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
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-xl">
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
              className={`rounded-2xl border bg-card p-5 shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-xl sm:p-6 ${
                isOpen ? "border-primary ring-2 ring-primary/30" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {req.userName && (
                    <p className="text-sm font-semibold mb-1">{req.userName}</p>
                  )}
                  <p className="text-sm text-foreground">
                    {formatDate(req.startDate)} – {formatDate(req.endDate)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {req.days} Tage · {req.absenceType === "SICK" ? "Krank" : req.absenceType === "OTHER" ? "Abwesenheit" : "Urlaub"}
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
                  {req.approvedBy?.name && req.status !== "PENDING" ? (
                    <span className="text-[11px] text-muted-foreground">durch {req.approvedBy.name}</span>
                  ) : null}
                </div>
              </div>

              {/* Entscheidungs-Kontext: nur Manager-Sicht & nur für Urlaub (nicht Krank) */}
              {ctx && req.absenceType !== "SICK" && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                      tone === "over"
                        ? "border-red-200 bg-red-50 text-red-900"
                        : tone === "tight"
                          ? "border-amber-200 bg-amber-50 text-amber-900"
                          : "border-emerald-200 bg-emerald-50 text-emerald-900"
                    }`}
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
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
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
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                      <Users className="h-4 w-4 shrink-0" aria-hidden />
                      <span>Im Zeitraum sind keine Kolleg:innen abwesend.</span>
                    </div>
                  ) : null}
                </div>
              )}

              {req.decisionNote?.trim() && req.status !== "PENDING" ? (
                <div className="mt-3 flex gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] text-sky-950">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                  <p title={req.decisionNote}>
                    <span className="font-semibold">Entscheidung vom Chef:</span>{" "}
                    <span className="whitespace-pre-wrap">{req.decisionNote}</span>
                  </p>
                </div>
              ) : null}

              {/* Buttons → Confirm-Panel */}
              {showApprovals && !isOpen && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setError(null);
                      setDecision({ id: req.id, mode: "APPROVE", note: "" });
                    }}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-foreground ring-1 ring-inset ring-white/15 hover:bg-primary/90 active:scale-[0.99]"
                  >
                    <Check className="h-4 w-4" /> Genehmigen
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setError(null);
                      setDecision({ id: req.id, mode: "REJECT", note: "" });
                    }}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-800 hover:bg-red-100 active:scale-[0.99]"
                  >
                    <X className="h-4 w-4" /> Ablehnen
                  </button>
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
                      className={`mt-4 rounded-xl border p-4 ${
                        decision.mode === "APPROVE"
                          ? "border-emerald-200 bg-emerald-50/60"
                          : "border-red-200 bg-red-50/60"
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
                        className="mt-3 w-full resize-y rounded-lg border border-border bg-white px-3 py-2 text-sm"
                        autoFocus
                      />
                      {error ? (
                        <p className="mt-2 text-xs font-medium text-red-700">{error}</p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={submitDecision}
                          disabled={isPending}
                          className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-foreground ring-1 ring-inset ring-white/15 active:scale-[0.99] ${
                            decision.mode === "APPROVE"
                              ? "bg-primary hover:bg-primary/90"
                              : "bg-red-600 hover:bg-red-700"
                          }`}
                        >
                          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : decision.mode === "APPROVE" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          {isPending
                            ? "Speichere…"
                            : decision.mode === "APPROVE"
                              ? "Genehmigen & benachrichtigen"
                              : "Ablehnen & benachrichtigen"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDecision(null);
                            setError(null);
                          }}
                          disabled={isPending}
                          className="inline-flex min-h-11 items-center rounded-xl border border-border bg-white px-4 text-sm font-medium text-foreground hover:bg-muted/50"
                        >
                          Abbrechen
                        </button>
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
