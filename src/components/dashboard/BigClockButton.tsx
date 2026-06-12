"use client";
import { userErrorMessage } from "@/lib/errors/user-message";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, Loader2, Pause, Play, AlertTriangle, CloudOff } from "lucide-react";
import { toast } from "sonner";
import { clockIn, clockOut, toggleBreak } from "@/lib/actions/worklogs";
import { useVocabulary } from "@/components/VocabularyContext";
import { getQueuedClockCount } from "@/lib/offline/clock-queue";
import { performClockAction } from "@/lib/offline/perform-clock-action";

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

export function BigClockButton({
  isClockedIn,
  clockInAtIso,
  isOnBreak,
}: {
  isClockedIn: boolean;
  clockInAtIso: string | null;
  isOnBreak: boolean;
}) {
  const vocab = useVocabulary();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState<number>(() => Date.now());
  const [isOnline, setIsOnline] = useState(true);
  const [queuedCount, setQueuedCount] = useState(0);
  const initialState: OptimisticState = { isClockedIn, clockInAtIso, isOnBreak };
  const [state, applyOptimistic] = useOptimistic(initialState, reducer);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshQueueCount = async () => {
    try {
      setQueuedCount(await getQueuedClockCount());
    } catch {
      setQueuedCount(0);
    }
  };

  useEffect(() => {
    if (!state.isClockedIn) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [state.isClockedIn]);

  useEffect(() => {
    const sync = () => {
      setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
      void refreshQueueCount();
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    void refreshQueueCount();
  }, [isClockedIn, clockInAtIso, isOnBreak]);

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
        /* ignore */
      }
    }
  };

  const clockExec = {
    clockIn: () => clockIn(),
    clockOut: () => clockOut(),
    toggleBreak: () => toggleBreak(),
  };

  const handleClock = () => {
    haptic(18);
    if (state.isClockedIn) {
      startTransition(async () => {
        applyOptimistic({ type: "clockOut" });
        try {
          const outcome = await performClockAction("clockOut", clockExec);
          if (outcome.mode === "queued") {
            await refreshQueueCount();
            toast.success("Offline gespeichert – wird synchronisiert, sobald Internet da ist.", {
              icon: <CloudOff className="h-4 w-4" aria-hidden />,
            });
            return;
          }
          toast.success("Ausgestempelt.", {
            duration: 3000,
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
                    toast.error(userErrorMessage(e, "Konnte Stempel nicht wiederherstellen."));
                  }
                });
              },
            },
          });
          router.refresh();
        } catch (e: unknown) {
          toast.error(userErrorMessage(e, "Konnte nicht ausstempeln."));
          router.refresh();
        }
      });
      return;
    }

    startTransition(async () => {
      applyOptimistic({ type: "clockIn" });
      try {
        const outcome = await performClockAction("clockIn", clockExec);
        if (outcome.mode === "queued") {
          await refreshQueueCount();
          toast.success("Offline gespeichert – wird synchronisiert, sobald Internet da ist.", {
            icon: <CloudOff className="h-4 w-4" aria-hidden />,
          });
          return;
        }
        if (outcome.action === "clockIn" && outcome.result.warning) {
          toast.success("Eingestempelt.", {
            description: outcome.result.warning,
            icon: <LogIn className="h-4 w-4" aria-hidden />,
            duration: 4500,
          });
        } else {
          toast.success("Eingestempelt.", {
            icon: <LogIn className="h-4 w-4" aria-hidden />,
            duration: 2200,
          });
        }
        router.refresh();
      } catch (e: unknown) {
        toast.error(userErrorMessage(e, "Konnte nicht einstempeln."));
        router.refresh();
      }
    });
  };

  const handleBreak = () => {
    if (!state.isClockedIn) return;
    haptic(12);
    startTransition(async () => {
      applyOptimistic({ type: "breakToggle" });
      const goingOnBreak = !state.isOnBreak;
      try {
        const outcome = await performClockAction("toggleBreak", clockExec);
        if (outcome.mode === "queued") {
          await refreshQueueCount();
          toast.success("Pause offline gespeichert – Sync folgt automatisch.", {
            icon: <CloudOff className="h-4 w-4" aria-hidden />,
          });
          return;
        }
        toast.success(goingOnBreak ? "Pause gestartet." : "Pause beendet.", {
          icon: goingOnBreak ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />,
        });
        router.refresh();
      } catch (e: unknown) {
        toast.error(userErrorMessage(e, "Konnte Pause nicht ändern."));
        router.refresh();
      }
    });
  };

  const offlineBanner =
    !isOnline || queuedCount > 0 ? (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 rounded-2xl border border-warning/35 bg-warning-soft px-3 py-2 text-xs font-semibold text-warning-foreground"
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {!isOnline
          ? queuedCount > 0
            ? `Offline – ${queuedCount} Stempel warten auf Sync.`
            : "Offline – Stempel werden lokal gespeichert und später synchronisiert."
          : `${queuedCount} Stempel werden gerade synchronisiert…`}
      </div>
    ) : null;

  return (
    <div className="flex flex-col gap-3">
      {offlineBanner}
      <button
        type="button"
        onClick={handleClock}
        disabled={isPending}
        aria-label={state.isClockedIn ? "Ausstempeln" : "Einstempeln"}
        aria-busy={isPending}
        className={`relative flex w-full items-center justify-center gap-3 rounded-3xl border border-white/20 px-6 py-6 text-lg font-extrabold tracking-tight transition-[filter,box-shadow] duration-200 ease-out active:brightness-95 active:scale-[0.99] disabled:opacity-90 sm:py-7 sm:text-xl dark:border-white/10 ${
          state.isClockedIn
            ? "bg-gradient-to-b from-danger to-danger text-white shadow-[var(--shadow-button)] hover:brightness-[1.06] hover:shadow-[var(--shadow-button-hover)]"
            : "bg-gradient-to-b from-brand to-brand-hover text-brand-foreground shadow-[var(--shadow-button)] hover:brightness-[1.05] hover:shadow-[var(--shadow-button-hover)]"
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
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 dark:border-white/10 dark:bg-surface/85">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {state.isOnBreak ? "Pause aktiv" : `Aktiver ${vocab.singular}`}
            </p>
            <p className="font-mono text-base font-bold tabular-nums text-foreground sm:text-lg">
              {formatHHMMSS(elapsedMs)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleBreak}
            disabled={isPending}
            className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-2xl border px-4 py-2 text-sm font-semibold transition-[background-color,border-color] duration-150 active:brightness-95 disabled:opacity-60 ${
              state.isOnBreak
                ? "border-brand/30 bg-brand-soft text-brand hover:bg-brand-soft/80 dark:border-white/10 dark:bg-brand/22"
                : "border-line bg-card text-foreground hover:bg-card/80 dark:border-white/10 dark:bg-surface/85"
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
