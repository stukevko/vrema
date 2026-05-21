"use client";

import type { AssignmentRisk } from "@/lib/planning/board-assistant";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, X } from "lucide-react";

type Props = {
  open: boolean;
  memberName: string;
  slotLabel: string;
  risk: AssignmentRisk | null;
  alternative: { userId: string; name: string; saldoHours: number } | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onPickAlternative: () => void;
};

export function AssignmentGuardDialog({
  open,
  memberName,
  slotLabel,
  risk,
  alternative,
  isPending,
  onClose,
  onConfirm,
  onPickAlternative,
}: Props) {
  if (!open || !risk) return null;

  const saldoH = risk.saldoHours != null ? Math.round(Math.abs(risk.saldoHours)) : null;

  return (
    <>
      <button type="button" className="fixed inset-0 z-[210] bg-black/35" aria-label="Schließen" onClick={onClose} />
      <div
        className="fixed inset-x-4 top-[20%] z-[220] mx-auto max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
        role="alertdialog"
        aria-labelledby="assignment-guard-title"
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning-foreground">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p id="assignment-guard-title" className="text-base font-bold text-foreground">
              Zuweisung prüfen
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Bedenke: <strong className="text-foreground">{memberName}</strong>
              {saldoH != null ? (
                <>
                  {" "}
                  hat bereits <strong className="text-warning-foreground">{saldoH} Überstunden</strong>
                </>
              ) : null}
              . Schicht <strong className="text-foreground">{slotLabel}</strong> trotzdem zuweisen?
            </p>
            {risk.reasons.length > 0 ? (
              <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
                {risk.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            ) : null}
            {alternative ? (
              <p className="mt-3 rounded-lg border border-brand/25 bg-brand-soft/40 px-3 py-2 text-xs text-foreground">
                Alternativ: <strong>{alternative.name}</strong> ({alternative.saldoHours >= 0 ? "+" : ""}
                {alternative.saldoHours}h Saldo)
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {alternative ? (
            <Button type="button" variant="outline" size="md" disabled={isPending} onClick={onPickAlternative}>
              {alternative.name} wählen
            </Button>
          ) : null}
          <Button type="button" variant="brand" size="md" disabled={isPending} loading={isPending} onClick={onConfirm}>
            Trotzdem zuweisen
          </Button>
        </div>
      </div>
    </>
  );
}
