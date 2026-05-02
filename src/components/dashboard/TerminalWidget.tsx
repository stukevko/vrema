"use client";

import { useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, LogIn, LogOut, MapPin, Loader2, Pause } from "lucide-react";
import { clockIn, clockOut, toggleBreak } from "@/lib/actions/worklogs";

interface TerminalWidgetProps {
  activeLog: {
    id: string;
    clockIn: Date;
    breakMins: number;
    isOnBreak: boolean;
    breakStartedAt: Date | null;
  } | null;
  gpsRequired: boolean;
  gpsFeatureEnabled: boolean;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function errorHint(error: string | null) {
  if (!error) return null;
  if (error.includes("erfordert GPS")) {
    return "Bitte GPS aktivieren, Standortfreigabe im Browser erlauben und erneut einstempeln.";
  }
  if (error.includes("GPS-Radius")) {
    return "Du bist ausserhalb des erlaubten Radius. Bitte zur Arbeitsadresse wechseln oder Admin kontaktieren.";
  }
  return null;
}

export function TerminalWidget({ activeLog, gpsRequired, gpsFeatureEnabled }: TerminalWidgetProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [useGps, setUseGps] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (gpsRequired) setUseGps(true);
  }, [gpsRequired]);

  const handleClockIn = () => {
    setError(null);
    if (useGps && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          startTransition(async () => {
            try {
              await clockIn(pos.coords.latitude, pos.coords.longitude);
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : "Fehler beim Einstempeln");
            }
          });
        },
        () => {
          startTransition(async () => {
            try {
              await clockIn();
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : "Fehler beim Einstempeln");
            }
          });
        }
      );
    } else {
      startTransition(async () => {
        try {
          await clockIn();
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : "Fehler beim Einstempeln");
        }
      });
    }
  };

  const handleClockOut = () => {
    setError(null);
    startTransition(async () => {
      try {
        await clockOut();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Fehler beim Ausstempeln");
      }
    });
  };

  const handleBreakToggle = () => {
    setError(null);
    startTransition(async () => {
      try {
        await toggleBreak();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Fehler beim Pausenwechsel");
      }
    });
  };

  const workedMs = (() => {
    if (!activeLog) return 0;
    const nowMs = now;
    const clockInMs = new Date(activeLog.clockIn).getTime();
    const alreadyBreakMs = activeLog.breakMins * 60_000;
    const activeBreakMs =
      activeLog.isOnBreak && activeLog.breakStartedAt
        ? Math.max(0, nowMs - new Date(activeLog.breakStartedAt).getTime())
        : 0;
    return Math.max(0, nowMs - clockInMs - alreadyBreakMs - activeBreakMs);
  })();

  return (
    <div className="rounded-3xl bg-card/90 backdrop-blur-md border border-border p-6 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-lg">Terminal</h2>
        {gpsFeatureEnabled && (
          <label
            className={`flex items-center gap-2 text-xs text-muted-foreground select-none ${
              gpsRequired ? "cursor-not-allowed opacity-90" : "cursor-pointer"
            }`}
          >
            <input
              type="checkbox"
              checked={useGps}
              onChange={(e) => setUseGps(e.target.checked)}
              disabled={gpsRequired}
              className="w-3.5 h-3.5 accent-[#22c55e]"
            />
            <MapPin className="w-3 h-3" />
            {gpsRequired ? "GPS Pflicht" : "GPS"}
          </label>
        )}
      </div>

      {gpsRequired && (
        <div className="mb-4 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs text-amber-200">
          Business-Regel aktiv: GPS innerhalb des Firmenradius ist beim Einstempeln verpflichtend.
        </div>
      )}

      <div className="flex flex-col items-center py-6">
        {/* Status indicator */}
        <AnimatePresence mode="wait">
          {activeLog ? (
            <motion.div
              key="active"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center gap-3 mb-8"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                  <Clock className="w-8 h-8 text-primary" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute top-1 right-1 w-3 h-3 rounded-full bg-primary"
                />
              </div>
              <div className="text-center">
                <p className="text-3xl font-mono font-bold text-primary">
                  {formatDuration(workedMs)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeLog.isOnBreak ? (
                    "Pause aktiv"
                  ) : (
                    <>
                      Eingestempelt seit{" "}
                      <span className="font-mono">
                        {new Date(activeLog.clockIn).toLocaleTimeString("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>{" "}
                      Uhr
                    </>
                  )}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="inactive"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="mb-8"
            >
              <div className="w-20 h-20 rounded-2xl bg-card border-2 border-border flex items-center justify-center">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Button */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={activeLog ? handleClockOut : handleClockIn}
          disabled={isPending}
          className={`w-full py-4 rounded-full font-bold text-base flex items-center justify-center gap-2 transition-all ${
            activeLog
              ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
              : "bg-primary text-black hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(150,255,180,0.3)]"
          }`}
        >
          {isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : activeLog ? (
            <>
              <LogOut className="w-5 h-5" />
              Ausstempeln
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              Einstempeln
            </>
          )}
        </motion.button>

        {activeLog && (
          <div className="mt-3 w-full">
            <button
              type="button"
              onClick={handleBreakToggle}
              disabled={isPending}
              className={`w-full rounded-2xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
                activeLog.isOnBreak
                  ? "border-primary/40 bg-primary/15 text-primary hover:bg-primary/20"
                  : "border-border bg-card text-foreground hover:bg-card/80"
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <Pause className="h-3.5 w-3.5" />
                {activeLog.isOnBreak ? "Pause beenden" : "Pause starten"}
              </span>
            </button>
          </div>
        )}

        {error && (
          <div className="mt-3 space-y-1 text-center">
            <p className="text-xs text-red-700">{error}</p>
            {errorHint(error) && <p className="text-[11px] text-muted-foreground">{errorHint(error)}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
