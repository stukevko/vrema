import type { ShiftTaskWallRow } from "@/lib/shift-tasks/wall";
import { Activity, CheckCircle2 } from "lucide-react";

export function LiveOperationsWidget({ rows }: { rows: ShiftTaskWallRow[] }) {
  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-brand-soft text-brand dark:border-white/10 dark:bg-brand/25">
          <Activity className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Live im Betrieb</p>
          <h3 className="text-base font-bold tracking-tight text-foreground">Schicht-Aufgaben</h3>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Keine eingestempelten Schichten mit Aufgabenliste – sobald das Team einstempelt, siehst du hier den Fortschritt.
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => {
            const pct = r.totalCount === 0 ? 0 : Math.min(100, Math.round((r.doneCount / r.totalCount) * 100));
            const label = `${r.roleLabel}: ${r.doneCount}/${r.totalCount} erledigt`;
            return (
              <li key={r.listId}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 text-sm">
                  <span className="font-semibold text-foreground">{label}</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">{r.shiftLabel}</span>
                </div>
                {r.userName ? (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{r.userName}</p>
                ) : null}
                <div className="mt-2 h-2 overflow-hidden rounded-full border border-white/30 bg-surface-muted dark:border-white/10 dark:bg-surface-muted/55">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand to-brand-hover shadow-[0_0_16px_-4px_hsl(var(--brand)_/_0.6)] transition-[width] duration-300 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {r.totalCount > 0 && pct === 0 ? (
                  <p className="mt-2 text-xs font-medium text-warning-foreground">
                    Schicht gestartet – Aufgaben warten!
                  </p>
                ) : null}
                {r.totalCount > 0 && pct === 100 ? (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand">
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                    Alle Punkte erledigt
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
