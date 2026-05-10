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
      className="rounded-3xl border border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-white p-4 shadow-sm sm:p-6"
    >
      <div className="mb-3 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700">Deine Schicht läuft</p>
          <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
            {allDone ? "Alle Aufgaben erledigt" : "Aufgaben für heute"}
          </h2>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold tabular-nums text-emerald-800">
          {done}/{total}
        </span>
      </div>
      <ActiveShiftTasks initial={tasks} />
    </section>
  );
}
