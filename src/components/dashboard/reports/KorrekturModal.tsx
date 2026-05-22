"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Loader2 } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "ON_TIME", label: "Pünktlich" },
  { value: "LATE", label: "Verspätet" },
  { value: "MANUAL_ADJUSTED", label: "Manuell korrigiert (Chef)" },
] as const;

export type KorrekturStatus = (typeof STATUS_OPTIONS)[number]["value"];

export type KorrekturModalLog = {
  id: string;
  userName: string;
  clockIn: string;
  clockOut: string | null;
  breakMins: number;
  status: string;
};

type Props = {
  open: boolean;
  mode: "correct" | "delete";
  log: KorrekturModalLog | null;
  isPending: boolean;
  formatForDateTimeLocal: (iso: string) => string;
  onOpenChange: (open: boolean) => void;
  onSubmitCorrect: (payload: {
    clockIn: string;
    clockOut: string;
    breakMins: number;
    status: KorrekturStatus;
    reason: string;
  }) => void;
  onSubmitDelete: (reason: string) => void;
};

export function KorrekturModal({
  open,
  mode,
  log,
  isPending,
  formatForDateTimeLocal,
  onOpenChange,
  onSubmitCorrect,
  onSubmitDelete,
}: Props) {
  const reasonId = useId();
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [breakMins, setBreakMins] = useState("0");
  const [status, setStatus] = useState<KorrekturStatus>("MANUAL_ADJUSTED");
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !log) return;
    setFieldError(null);
    setReason("");
    if (mode === "correct") {
      setClockIn(formatForDateTimeLocal(log.clockIn));
      setClockOut(log.clockOut ? formatForDateTimeLocal(log.clockOut) : "");
      setBreakMins(String(log.breakMins ?? 0));
      setStatus(log.status === "ABSENT" ? "MANUAL_ADJUSTED" : (log.status as KorrekturStatus));
    }
  }, [open, log, mode, formatForDateTimeLocal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setFieldError("Bitte einen Grund angeben — für die Nachvollziehbarkeit im Audit-Protokoll.");
      return;
    }
    if (mode === "delete") {
      onSubmitDelete(trimmedReason);
      return;
    }
    if (!clockIn.trim()) {
      setFieldError("Bitte eine Einstempelzeit angeben.");
      return;
    }
    onSubmitCorrect({
      clockIn: clockIn.trim(),
      clockOut: clockOut.trim(),
      breakMins: Number.parseInt(breakMins || "0", 10),
      status,
      reason: trimmedReason,
    });
  };

  const title = mode === "delete" ? "Zeiteintrag löschen" : "Fehlenden Tag korrigieren";
  const description =
    mode === "delete"
      ? `Eintrag von ${log?.userName ?? "Mitarbeiter"} wird unwiderruflich entfernt. Der Löschgrund wird protokolliert.`
      : `Trage die korrigierten Zeiten für ${log?.userName ?? "Mitarbeiter"} ein. Vorher/Nachher bleibt im Audit nachvollziehbar.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={reasonId}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {mode === "correct" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Einstempelung</span>
                <input
                  type="datetime-local"
                  value={clockIn}
                  onChange={(e) => setClockIn(e.target.value)}
                  disabled={isPending}
                  required
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Ausstempelung (optional)</span>
                <input
                  type="datetime-local"
                  value={clockOut}
                  onChange={(e) => setClockOut(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Pause (Minuten)</span>
                <input
                  type="number"
                  min={0}
                  max={480}
                  value={breakMins}
                  onChange={(e) => setBreakMins(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm tabular-nums text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Status nach Korrektur</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as KorrekturStatus)}
                  disabled={isPending}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          <label className="mt-4 block" htmlFor={reasonId}>
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              {mode === "delete" ? "Grund der Löschung" : "Grund der Korrektur"} <span className="text-danger">*</span>
            </span>
            <textarea
              id={reasonId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isPending}
              rows={3}
              placeholder="z. B. vergessenes Ausstempeln, Fehlbuchung Terminal, Abstimmung mit Lohnbüro …"
              className="w-full resize-y rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>

          {fieldError ? (
            <p className="mt-2 text-xs font-medium text-danger" role="alert">
              {fieldError}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="md"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              variant={mode === "delete" ? "danger" : "brand"}
              size="md"
              loading={isPending}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Speichern…
                </>
              ) : mode === "delete" ? (
                "Eintrag löschen"
              ) : (
                "Korrektur speichern"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
