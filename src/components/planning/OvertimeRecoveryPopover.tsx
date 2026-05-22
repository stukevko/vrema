"use client";

import { useEffect, useState, useTransition } from "react";
import { applyOvertimeRecovery, getOvertimeRecoveryRecommendation } from "@/lib/actions/planner-board";
import {
  formatSaldoHours,
  type MemberSaldoSnapshot,
  type OvertimeRecoveryDay,
} from "@/lib/planning/board-assistant";
import { userErrorMessage } from "@/lib/errors/user-message";
import { Button } from "@/components/ui/Button";
import { Flame, Loader2, X } from "lucide-react";

type Props = {
  open: boolean;
  userId: string | null;
  weekIndex: number;
  anchorRect: DOMRect | null;
  onClose: () => void;
  onApplied: () => void;
};

export function OvertimeRecoveryPopover({
  open,
  userId,
  weekIndex,
  anchorRect,
  onClose,
  onApplied,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [memberName, setMemberName] = useState("");
  const [saldo, setSaldo] = useState<MemberSaldoSnapshot | null>(null);
  const [days, setDays] = useState<OvertimeRecoveryDay[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    void getOvertimeRecoveryRecommendation(userId, weekIndex)
      .then((res) => {
        setMemberName(res.memberName);
        setSaldo(res.saldo);
        setDays(res.suggestedDays);
        setSelected(new Set(res.suggestedDays.map((d) => d.dayOfWeek)));
      })
      .catch((e: unknown) => {
        setError(userErrorMessage(e, "Empfehlung konnte nicht geladen werden."));
        setDays([]);
      })
      .finally(() => setLoading(false));
  }, [open, userId, weekIndex]);

  if (!open || !userId) return null;

  const style: React.CSSProperties = anchorRect
    ? {
        position: "fixed",
        top: Math.min(anchorRect.bottom + 8, window.innerHeight - 320),
        left: Math.min(Math.max(8, anchorRect.left), window.innerWidth - 300),
        zIndex: 200,
        maxWidth: 288,
      }
    : { position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", zIndex: 200, maxWidth: 288 };

  const toggleDay = (dow: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(dow)) next.delete(dow);
      else next.add(dow);
      return next;
    });
  };

  const apply = () => {
    if (selected.size === 0) {
      setError("Bitte mindestens einen Tag auswählen.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await applyOvertimeRecovery({
          userId,
          weekIndex,
          dayOfWeeks: [...selected],
        });
        setMessage(
          `Freizeitausgleich für ${result.daysApplied} Tag${result.daysApplied === 1 ? "" : "e"} eingetragen. Schichten wurden freigegeben.`,
        );
        onApplied();
        onClose();
      } catch (e: unknown) {
        setError(userErrorMessage(e, "Freizeitausgleich fehlgeschlagen."));
      }
    });
  };

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[190] bg-black/20"
        aria-label="Schließen"
        onClick={onClose}
      />
      <div
        style={style}
        className="rounded-2xl border border-border bg-card p-4 shadow-xl"
        role="dialog"
        aria-labelledby="overtime-recovery-title"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-warning-soft text-warning-foreground">
              <Flame className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p id="overtime-recovery-title" className="text-sm font-bold text-foreground">
                Überstunden abbauen
              </p>
              <p className="text-xs text-muted-foreground">{memberName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Plan wird analysiert…
          </p>
        ) : (
          <>
            {saldo ? (
              <p className="mt-3 text-sm text-foreground">
                <strong>{memberName}</strong> hat aktuell{" "}
                <strong className="text-warning-foreground">{formatSaldoHours(saldo.saldoMinutes)}</strong>{" "}
                Überstunden. VREMA hat deinen Plan und die prognostizierte Last abgeglichen.
              </p>
            ) : null}

            {days.length > 0 ? (
              <div className="mt-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Empfehlung</p>
                {days.map((d) => (
                  <label
                    key={d.dayOfWeek}
                    className="flex cursor-pointer items-start gap-2 rounded-xl border border-border bg-background px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(d.dayOfWeek)}
                      onChange={() => toggleDay(d.dayOfWeek)}
                      className="mt-1"
                      disabled={isPending}
                    />
                    <span className="text-xs">
                      <span className="font-semibold text-foreground">
                        {d.dayLabel}
                      </span>
                      <span className="text-muted-foreground"> — {d.reason}</span>
                      {d.shiftCount > 0 ? (
                        <span className="block text-[10px] text-muted-foreground">
                          {d.shiftCount} Schicht{d.shiftCount === 1 ? "" : "en"} werden freigegeben
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Keine passenden ruhigen Tage in dieser Woche gefunden — wähle manuell unter Abwesenheit.
              </p>
            )}

            <Button
              type="button"
              variant="brand"
              size="md"
              className="mt-4 w-full"
              disabled={isPending || selected.size === 0}
              loading={isPending}
              onClick={apply}
            >
              Freizeitausgleich eintragen
            </Button>
          </>
        )}

        {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
        {message ? <p className="mt-2 text-xs text-foreground">{message}</p> : null}
      </div>
    </>
  );
}
