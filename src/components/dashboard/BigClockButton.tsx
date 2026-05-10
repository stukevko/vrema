"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, Loader2, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { clockIn, clockOut, toggleBreak } from "@/lib/actions/worklogs";

function formatHHMMSS(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!isClockedIn) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [isClockedIn]);

  const elapsedMs =
    isClockedIn && clockInAtIso ? Math.max(0, now - new Date(clockInAtIso).getTime()) : 0;

  const handleClock = () => {
    startTransition(async () => {
      try {
        if (isClockedIn) {
          await clockOut();
          toast.success("Ausgestempelt – schönen Feierabend!");
        } else {
          await clockIn();
          toast.success("Eingestempelt. Los geht's!");
        }
        router.refresh();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Konnte nicht stempeln.");
      }
    });
  };

  const handleBreak = () => {
    if (!isClockedIn) return;
    startTransition(async () => {
      try {
        await toggleBreak();
        toast.success(isOnBreak ? "Pause beendet." : "Pause gestartet.");
        router.refresh();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Konnte Pause nicht ändern.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleClock}
        disabled={isPending}
        aria-label={isClockedIn ? "Ausstempeln" : "Einstempeln"}
        className={`relative flex w-full items-center justify-center gap-3 rounded-3xl px-6 py-6 text-lg font-extrabold tracking-tight shadow-lg transition-all active:scale-[0.98] disabled:opacity-80 sm:py-7 sm:text-xl ${
          isClockedIn
            ? "bg-red-500 text-white shadow-red-500/30 hover:bg-red-600"
            : "bg-emerald-500 text-white shadow-emerald-500/30 hover:bg-emerald-600"
        }`}
      >
        {isPending ? (
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
        ) : isClockedIn ? (
          <LogOut className="h-6 w-6" aria-hidden />
        ) : (
          <LogIn className="h-6 w-6" aria-hidden />
        )}
        <span>{isClockedIn ? "Jetzt Ausstempeln" : "Jetzt Einstempeln"}</span>
      </button>

      {isClockedIn ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white/95 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {isOnBreak ? "Pause aktiv" : "Aktive Schicht"}
            </p>
            <p className="font-mono text-base font-bold tabular-nums text-foreground sm:text-lg">
              {formatHHMMSS(elapsedMs)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleBreak}
            disabled={isPending}
            className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-2xl border px-4 py-2 text-sm font-semibold transition-colors active:scale-95 disabled:opacity-60 ${
              isOnBreak
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                : "border-border bg-card text-foreground hover:bg-card/80"
            }`}
          >
            {isOnBreak ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
            {isOnBreak ? "Pause beenden" : "Pause"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
