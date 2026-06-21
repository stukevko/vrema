"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Handshake, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/Button";
import { PlannerModalPortal } from "@/components/planning/PlannerModalPortal";
import {
  getColleagueShiftsForSwap,
  getShiftTradeColleagues,
} from "@/lib/actions/shift-trade";
import { requestShiftTradeToColleague } from "@/lib/actions/shift-trade";
import { userErrorMessage } from "@/lib/errors/user-message";

type Colleague = Awaited<ReturnType<typeof getShiftTradeColleagues>>[number];
type CounterShift = Awaited<ReturnType<typeof getColleagueShiftsForSwap>>[number];

type Props = {
  open: boolean;
  shiftId: string;
  slotLabel: string;
  onClose: () => void;
  onSent?: () => void;
};

export function ShiftTradePickColleagueSheet({ open, shiftId, slotLabel, onClose, onSent }: Props) {
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [counterShifts, setCounterShifts] = useState<CounterShift[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [counterShiftId, setCounterShiftId] = useState("");
  const [mode, setMode] = useState<"give" | "swap">("give");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSelectedId("");
    setCounterShiftId("");
    setMode("give");
    void getShiftTradeColleagues().then(setColleagues);
  }, [open]);

  useEffect(() => {
    if (!open || !selectedId || mode !== "swap") {
      setCounterShifts([]);
      setCounterShiftId("");
      return;
    }
    void getColleagueShiftsForSwap(selectedId).then(setCounterShifts);
  }, [open, selectedId, mode]);

  if (!open) return null;

  const canSend =
    Boolean(selectedId) && (mode === "give" || (mode === "swap" && counterShiftId)) && !pending;

  return (
    <PlannerModalPortal open={open}>
      <div
        className="fixed inset-0 z-[150] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className="absolute inset-0 bg-black/30 backdrop-blur-[8px]" aria-label="Schließen" onClick={onClose} />
        <div className="relative flex max-h-[min(520px,calc(100dvh-2rem))] w-full max-w-[360px] flex-col overflow-hidden rounded-[1.35rem] border border-border/60 bg-card shadow-xl">
          <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                An Kolleg:in senden
              </p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">{slotLabel}</h2>
            </div>
            <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted/60">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-2">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/25 p-1">
              <button
                type="button"
                onClick={() => setMode("give")}
                className={`rounded-lg px-2 py-2 text-xs font-semibold ${mode === "give" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
              >
                Übergeben
              </button>
              <button
                type="button"
                onClick={() => setMode("swap")}
                className={`rounded-lg px-2 py-2 text-xs font-semibold ${mode === "swap" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
              >
                Tauschen
              </button>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Wen anfragen?</p>
              <div className="space-y-1.5">
                {colleagues.map((c) => {
                  const active = c.id === selectedId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${active ? "bg-brand-soft ring-1 ring-brand/40" : "hover:bg-muted/50"}`}
                    >
                      <Avatar src={c.image} fallback={c.name.slice(0, 2).toUpperCase()} alt={c.name} className="h-8 w-8" />
                      <span className="truncate text-sm font-medium">{c.name}</span>
                      {active ? <Check className="ml-auto h-4 w-4 text-brand" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {mode === "swap" && selectedId ? (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Gegen-Schicht wählen</p>
                {counterShifts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Keine tauschbaren Schichten bei dieser Person.</p>
                ) : (
                  <div className="space-y-1.5">
                    {counterShifts.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setCounterShiftId(s.id)}
                        className={`flex w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium ${counterShiftId === s.id ? "bg-brand-soft ring-1 ring-brand/40" : "hover:bg-muted/50"}`}
                      >
                        {s.slotLabel}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {error ? <p className="text-xs text-danger-foreground">{error}</p> : null}
          </div>

          <div className="px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
            <Button
              type="button"
              variant="brand"
              className="min-h-11 w-full rounded-xl"
              disabled={!canSend}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  try {
                    await requestShiftTradeToColleague({
                      shiftId,
                      targetUserId: selectedId,
                      counterShiftId: mode === "swap" ? counterShiftId : null,
                    });
                    onSent?.();
                    onClose();
                  } catch (e: unknown) {
                    setError(userErrorMessage(e, "Anfrage konnte nicht gesendet werden."));
                  }
                });
              }}
            >
              <Handshake className="mr-1.5 h-4 w-4" />
              Anfrage senden
            </Button>
          </div>
        </div>
      </div>
    </PlannerModalPortal>
  );
}
