"use client";

import { useEffect, useState, useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, LogIn, LogOut, Loader2, Pause, WifiOff, Check } from "lucide-react";
import { clockIn, clockOut, toggleBreak } from "@/lib/actions/worklogs";

export interface TerminalActiveLog {
  id: string;
  clockIn: Date;
  breakMins: number;
  isOnBreak: boolean;
  breakStartedAt: Date | null;
}

interface TerminalWidgetProps {
  activeLog: TerminalActiveLog | null;
}

type OptimisticAction =
  | { type: "clock_in" }
  | { type: "clock_out" }
  | { type: "break_toggle"; nextIsOnBreak: boolean };

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function mergeOptimistic(state: TerminalActiveLog | null, action: OptimisticAction): TerminalActiveLog | null {
  if (action.type === "clock_in") {
    const now = new Date();
    return {
      id: "__optimistic__",
      clockIn: now,
      breakMins: 0,
      isOnBreak: false,
      breakStartedAt: null,
    };
  }
  if (action.type === "clock_out") return null;
  if (action.type === "break_toggle" && state) {
    return {
      ...state,
      isOnBreak: action.nextIsOnBreak,
      breakStartedAt: action.nextIsOnBreak ? new Date() : null,
    };
  }
  return state;
}

export function TerminalWidget({ activeLog }: TerminalWidgetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [onLine, setOnLine] = useState(true);
  const [displayLog, addOptimistic] = useOptimistic(activeLog, mergeOptimistic);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const sync = () => setOnLine(typeof navigator !== "undefined" ? navigator.onLine : true);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 2800);
    return () => clearTimeout(t);
  }, [success]);

  const runAfterSuccess = async (message: string) => {
    setSuccess(message);
    setError(null);
    await router.refresh();
  };

  const handleClockIn = () => {
    if (!onLine) {
      setError("Keine Netzwerkverbindung. Bitte prüfen Sie Ihre Verbindung und versuchen Sie es erneut.");
      return;
    }
    setError(null);
    startTransition(async () => {
      addOptimistic({ type: "clock_in" });
      try {
        await clockIn();
        await runAfterSuccess("Eingestempelt.");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Fehler beim Einstempeln");
      }
    });
  };

  const handleClockOut = () => {
    if (!onLine) {
      setError("Keine Netzwerkverbindung. Bitte prüfen Sie Ihre Verbindung und versuchen Sie es erneut.");
      return;
    }
    setError(null);
    startTransition(async () => {
      addOptimistic({ type: "clock_out" });
      try {
        await clockOut();
        await runAfterSuccess("Ausgestempelt.");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Fehler beim Ausstempeln");
      }
    });
  };

  const handleBreakToggle = () => {
    if (!displayLog) return;
    if (!onLine) {
      setError("Keine Netzwerkverbindung. Bitte prüfen Sie Ihre Verbindung und versuchen Sie es erneut.");
      return;
    }
    setError(null);
    const next = !displayLog.isOnBreak;
    startTransition(async () => {
      addOptimistic({ type: "break_toggle", nextIsOnBreak: next });
      try {
        await toggleBreak();
        await runAfterSuccess(next ? "Pause gestartet." : "Pause beendet.");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Fehler beim Pausenwechsel");
      }
    });
  };

  const workedMs = (() => {
    if (!displayLog) return 0;
    const nowMs = now;
    const clockInMs = new Date(displayLog.clockIn).getTime();
    const alreadyBreakMs = displayLog.breakMins * 60_000;
    const activeBreakMs =
      displayLog.isOnBreak && displayLog.breakStartedAt
        ? Math.max(0, nowMs - new Date(displayLog.breakStartedAt).getTime())
        : 0;
    return Math.max(0, nowMs - clockInMs - alreadyBreakMs - activeBreakMs);
  })();

  const isSyncing = displayLog?.id === "__optimistic__";

  return (
    <div className="rounded-2xl border border-border bg-card/90 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-md sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Terminal</h2>
        {!onLine && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            <WifiOff className="h-3 w-3" aria-hidden />
            Offline
          </span>
        )}
      </div>

      <p className="mb-4 rounded-xl border border-border bg-background/80 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        Ohne Standort-Tracking: Einstempeln direkt hier oder am PIN-Terminal – DSGVO-konform ohne GPS.
      </p>

      {success && (
        <div className="mb-3 flex items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-center text-sm font-semibold text-primary">
          <Check className="h-4 w-4 shrink-0" aria-hidden />
          {success}
        </div>
      )}

      <div className="flex flex-col items-center py-6">
        <AnimatePresence mode="wait">
          {displayLog ? (
            <motion.div
              key="active"
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="mb-8 flex flex-col items-center gap-3"
            >
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-primary/30 bg-primary/10">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                {!displayLog.isOnBreak && (
                  <motion.div
                    animate={{ scale: [1, 1.35, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute right-1 top-1 h-3 w-3 rounded-full bg-primary"
                  />
                )}
              </div>
              <div className="text-center">
                <p className="font-mono text-3xl font-bold text-primary">{formatDuration(workedMs)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {displayLog.isOnBreak ? (
                    "Pause aktiv"
                  ) : (
                    <>
                      Eingestempelt seit{" "}
                      <span className="font-mono">
                        {new Date(displayLog.clockIn).toLocaleTimeString("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>{" "}
                      Uhr
                    </>
                  )}
                </p>
                {isSyncing && <p className="mt-1 text-[10px] text-muted-foreground">Synchronisiere …</p>}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="inactive"
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="mb-8"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-border bg-card">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={displayLog ? handleClockOut : handleClockIn}
          disabled={isPending}
          className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-full py-4 text-base font-bold transition-all sm:min-h-0 ${
            displayLog
              ? "border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
              : "bg-primary text-foreground hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(150,255,180,0.3)]"
          }`}
        >
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : displayLog ? (
            <>
              <LogOut className="h-5 w-5" aria-hidden />
              Ausstempeln
            </>
          ) : (
            <>
              <LogIn className="h-5 w-5" aria-hidden />
              Einstempeln
            </>
          )}
        </motion.button>

        {displayLog && (
          <div className="mt-3 w-full">
            <button
              type="button"
              onClick={handleBreakToggle}
              disabled={isPending}
              className={`flex min-h-12 w-full items-center justify-center rounded-2xl border px-3 py-3 text-xs font-semibold transition-colors disabled:opacity-60 sm:min-h-0 sm:py-2 ${
                displayLog.isOnBreak
                  ? "border-primary/40 bg-primary/15 text-primary hover:bg-primary/20"
                  : "border-border bg-card text-foreground hover:bg-card/80"
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <Pause className="h-3.5 w-3.5" aria-hidden />
                {displayLog.isOnBreak ? "Pause beenden" : "Pause starten"}
              </span>
            </button>
          </div>
        )}

        {error && (
          <div className="mt-3 text-center">
            <p className="text-xs font-medium text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
