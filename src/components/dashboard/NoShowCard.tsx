"use client";
import { userErrorMessage } from "@/lib/errors/user-message";

import { useEffect, useState, useTransition } from "react";
import { AlertOctagon, BellRing, CheckCircle2 } from "lucide-react";
import { listNoShows, sendNoShowReminder, type NoShowEntry } from "@/lib/actions/no-show";
import { useToast } from "@/components/ui/Toast";
import { DashboardSectionCard } from "@/components/dashboard/DashboardSectionCard";

/**
 *  No-Show-Card — wird im Manager-Dashboard angezeigt.
 *  Self-contained: lädt seine Daten beim Mount per Server-Action.
 */
export function NoShowCard() {
  const { show } = useToast();
  const [rows, setRows] = useState<NoShowEntry[] | null>(null);
  const [reminded, setReminded] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let mounted = true;
    listNoShows()
      .then((data) => mounted && setRows(data))
      .catch(() => mounted && setRows([]));
    return () => {
      mounted = false;
    };
  }, []);

  if (rows === null) return null;
  if (rows.length === 0) return null;

  function remind(shiftId: string) {
    startTransition(async () => {
      try {
        await sendNoShowReminder(shiftId);
        setReminded((prev) => new Set(prev).add(shiftId));
        show("E-Mail und App-Benachrichtigung gesendet.", "success");
      } catch (e) {
        show(userErrorMessage(e, "Erinnerung fehlgeschlagen."), "error");
      }
    });
  }

  return (
    <DashboardSectionCard
      tone="alert"
      title={`Nicht erschienen · ${rows.length} offen`}
      icon={AlertOctagon}
      ariaLabel="Nicht erschienen"
    >
      <ul className="space-y-2">
        {rows.map((r) => {
          const wasReminded = reminded.has(r.shiftId);
          return (
            <li
              key={r.shiftId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200/70 bg-card/80 px-4 py-3 dark:border-rose-500/20 dark:bg-surface/70"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{r.userName ?? "Unbekannt"}</p>
                <p className="text-xs text-muted-foreground">
                  Schicht {r.startTime} – {r.endTime} ·{" "}
                  <span className="font-semibold text-rose-700 dark:text-rose-300">
                    {r.minutesLate} Min überfällig
                  </span>
                </p>
              </div>
              {wasReminded ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
                  <CheckCircle2 className="h-3 w-3" aria-hidden /> Erinnert
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => remind(r.shiftId)}
                  disabled={pending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-xs font-bold text-white shadow-sm transition-[transform,box-shadow] hover:bg-rose-600/90 hover:shadow-md active:scale-[0.98] disabled:opacity-60"
                >
                  <BellRing className="h-3.5 w-3.5" />
                  Per E-Mail erinnern
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </DashboardSectionCard>
  );
}
