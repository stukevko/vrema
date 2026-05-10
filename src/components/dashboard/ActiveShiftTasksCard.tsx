import { ActiveShiftTasks } from "@/components/dashboard/ActiveShiftTasks";
import type { ActiveShiftTasksDTO } from "@/lib/shift-tasks/active-shift-tasks-data";
import { Sparkles } from "lucide-react";

/**
 * Prominente Karte rund um die ActiveShiftTasks – wird oben im Dashboard angezeigt,
 * sobald der/die Mitarbeiter:in eingestempelt ist und eine Checkliste vorliegt.
 */
export function ActiveShiftTasksCard({ tasks }: { tasks: NonNullable<ActiveShiftTasksDTO> }) {
  const total = tasks.items.length;
  const done = tasks.items.filter((i) => i.status === "DONE").length;
  const allDone = total > 0 && done === total;

  return (
    <section
      aria-label="Deine Aufgaben für die aktuelle Schicht"
      className="glass-card relative overflow-hidden p-4 sm:p-6"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/15"
      />
      <div className="mb-3 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-brand-soft text-brand dark:border-white/10 dark:bg-brand/25">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand">Deine Schicht läuft</p>
          <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
            {allDone ? "Alle Aufgaben erledigt" : "Aufgaben für heute"}
          </h2>
        </div>
        <span className="shrink-0 rounded-full border border-white/30 bg-brand-soft px-2.5 py-1 text-[11px] font-bold tabular-nums text-brand dark:border-white/10 dark:bg-brand/25">
          {done}/{total}
        </span>
      </div>
      <ActiveShiftTasks initial={tasks} />
    </section>
  );
}
