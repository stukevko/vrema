"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, Loader2, Pause, Play, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { clockIn, clockOut, toggleBreak } from "@/lib/actions/worklogs";

function formatHHMMSS(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

type OptimisticState = {
  isClockedIn: boolean;
  clockInAtIso: string | null;
  isOnBreak: boolean;
};

type OptimisticAction =
  | { type: "clockIn" }
  | { type: "clockOut" }
  | { type: "breakToggle" };

function reducer(state: OptimisticState, action: OptimisticAction): OptimisticState {
  if (action.type === "clockIn") {
    return { isClockedIn: true, clockInAtIso: new Date().toISOString(), isOnBreak: false };
  }
  if (action.type === "clockOut") {
    return { isClockedIn: false, clockInAtIso: null, isOnBreak: false };
  }
  if (action.type === "breakToggle") {
    return { ...state, isOnBreak: !state.isOnBreak };
  }
  return state;
}

/**
 * Initiative VREMA: ein Stempel-Button mit Soforterlebnis statt „Loader und beten".
 * - Optimistic: Status springt sofort, Loader nur ganz kurz dezent overlay.
 * - Kontextuelle Bestätigung: bei Verspätung / Extra-Schicht klares Feedback statt nur „Eingestempelt".
 * - Undo beim Ausstempeln: 5 Sekunden lang ein Klick zurück, falls der Daumen verrutscht ist.
 * - Haptic Feedback (Mobile): kurzer Vibrate – fühlt sich wie ein echter Stempel an.
 */
export function BigClockButton({
  isClockedIn,
  clockInAtIso,
  isOnBreak,
}: {
  isClockedIn: boolean;
  clockInAtIso: string | null;
  isOnBreak: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState<number>(() => Date.now());
  const [isOnline, setIsOnline] = useState(true);
  const initialState: OptimisticState = { isClockedIn, clockInAtIso, isOnBreak };
  const [state, applyOptimistic] = useOptimistic(initialState, reducer);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!state.isClockedIn) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [state.isClockedIn]);

  useEffect(() => {
    const sync = () => setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const elapsedMs =
    state.isClockedIn && state.clockInAtIso
      ? Math.max(0, now - new Date(state.clockInAtIso).getTime())
      : 0;

  const haptic = (ms = 18) => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(ms);
      } catch {
        /* ignore – Browser ohne Vibrate-API */
      }
    }
  };

  const handleClock = () => {
    if (!isOnline) {
      toast.error("Keine Internetverbindung. Bitte kurz warten und erneut versuchen.");
      return;
    }
    haptic(18);
    if (state.isClockedIn) {
      // Ausstempeln mit 5-Sek-Undo
      startTransition(async () => {
        applyOptimistic({ type: "clockOut" });
        try {
          await clockOut();
          toast.success("Ausgestempelt – schönen Feierabend!", {
            duration: 5000,
            icon: <LogOut className="h-4 w-4" aria-hidden />,
            action: {
              label: "Rückgängig",
              onClick: () => {
                if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
                startTransition(async () => {
                  try {
                    await clockIn();
                    toast.success("Wieder eingestempelt.");
                    router.refresh();
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : "Konnte Stempel nicht wiederherstellen.");
                  }
                });
              },
            },
          });
          router.refresh();
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : "Konnte nicht ausstempeln.");
          router.refresh();
        }
      });
      return;
    }
    // Einstempeln
    startTransition(async () => {
      applyOptimistic({ type: "clockIn" });
      try {
        const res = await clockIn();
        if (res.warning) {
          toast.warning(res.warning, {
            icon: <AlertTriangle className="h-4 w-4" aria-hidden />,
            duration: 6000,
          });
        } else {
          toast.success("Eingestempelt. Los geht's!", {
            icon: <LogIn className="h-4 w-4" aria-hidden />,
          });
        }
        router.refresh();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Konnte nicht einstempeln.");
        router.refresh();
      }
    });
  };

  const handleBreak = () => {
    if (!state.isClockedIn) return;
    if (!isOnline) {
      toast.error("Keine Internetverbindung. Pause-Wechsel kommt gleich.");
      return;
    }
    haptic(12);
    startTransition(async () => {
      applyOptimistic({ type: "breakToggle" });
      const goingOnBreak = !state.isOnBreak;
      try {
        await toggleBreak();
        toast.success(goingOnBreak ? "Pause gestartet." : "Pause beendet.", {
          icon: goingOnBreak ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />,
        });
        router.refresh();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Konnte Pause nicht ändern.");
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {!isOnline ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-2xl border border-warning/35 bg-warning-soft/85 px-3 py-2 text-xs font-semibold text-warning-foreground backdrop-blur-md"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Offline – Stempeln pausiert, sobald Internet zurück ist.
        </div>
      ) : null}
      <button
        type="button"
        onClick={handleClock}
        disabled={isPending || !isOnline}
        aria-label={state.isClockedIn ? "Ausstempeln" : "Einstempeln"}
        aria-busy={isPending}
        className={`relative flex w-full items-center justify-center gap-3 rounded-3xl border border-white/20 px-6 py-6 text-lg font-extrabold tracking-tight backdrop-blur-md transition-all hover:-translate-y-px hover:scale-[1.01] active:translate-y-0 active:scale-[0.98] disabled:opacity-90 sm:py-7 sm:text-xl dark:border-white/10 ${
          state.isClockedIn
            ? "bg-gradient-to-b from-danger to-danger text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_18px_44px_-8px_hsl(var(--danger)_/_0.55)] hover:brightness-110"
            : "bg-gradient-to-b from-brand via-brand to-brand-hover text-brand-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22),0_18px_46px_-8px_hsl(var(--brand)_/_0.6)] hover:brightness-[1.06]"
        }`}
      >
        {isPending ? (
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
        ) : state.isClockedIn ? (
          <LogOut className="h-6 w-6" aria-hidden />
        ) : (
          <LogIn className="h-6 w-6" aria-hidden />
        )}
        <span>{state.isClockedIn ? "Jetzt Ausstempeln" : "Jetzt Einstempeln"}</span>
      </button>

      {state.isClockedIn ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/35 bg-white/85 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-surface/65">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {state.isOnBreak ? "Pause aktiv" : "Aktive Schicht"}
            </p>
            <p className="font-mono text-base font-bold tabular-nums text-foreground sm:text-lg">
              {formatHHMMSS(elapsedMs)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleBreak}
            disabled={isPending}
            className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-2xl border px-4 py-2 text-sm font-semibold backdrop-blur-md transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 ${
              state.isOnBreak
                ? "border-brand/30 bg-brand-soft/90 text-brand hover:bg-brand-soft dark:border-white/10 dark:bg-brand/22"
                : "border-line bg-card/95 text-foreground hover:bg-card/80 dark:border-white/10 dark:bg-surface/55"
            }`}
          >
            {state.isOnBreak ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
            {state.isOnBreak ? "Pause beenden" : "Pause"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
