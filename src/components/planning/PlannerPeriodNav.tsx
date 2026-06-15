"use client";

import { useMemo } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import {
  calendarWeeksForMonth,
  isoFromPlannerDate,
  monthYearLabel,
  shortWeekRangeLabel,
} from "@/lib/planning/cycle-display-date";

export type PlannerPlanView = "month" | "week";

type PlannerPeriodNavProps = {
  planCalendarMonday: Date;
  planView: PlannerPlanView;
  onSelectMonday: (monday: Date) => void;
  onPlanViewChange: (view: PlannerPlanView) => void;
  onShiftMonth: (delta: -1 | 1) => void;
};

export function PlannerPeriodNav({
  planCalendarMonday,
  planView,
  onSelectMonday,
  onPlanViewChange,
  onShiftMonth,
}: PlannerPeriodNavProps) {
  const monthLabel = useMemo(() => monthYearLabel(planCalendarMonday), [planCalendarMonday]);
  const calendarWeeks = useMemo(() => calendarWeeksForMonth(planCalendarMonday), [planCalendarMonday]);
  const activeMondayIso = isoFromPlannerDate(planCalendarMonday);

  return (
    <div className="space-y-2.5">
      <div className="surface-panel rounded-xl px-3 py-2 text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground">So geht&apos;s:</span> Monat oben ansehen → Tag antippen → Schicht
        hinzufügen. Für Drag &amp; Team-Übersicht: „Wochen-Board“.
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onShiftMonth(-1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted/40"
            aria-label="Vorheriger Monat"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <p className="min-w-[8.5rem] px-1.5 text-center text-sm font-bold capitalize text-foreground">{monthLabel}</p>
          <button
            type="button"
            onClick={() => onShiftMonth(1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted/40"
            aria-label="Nächster Monat"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div
          className="inline-flex rounded-lg border border-border bg-background p-0.5"
          role="tablist"
          aria-label="Planungsansicht"
        >
          <button
            type="button"
            role="tab"
            aria-selected={planView === "month"}
            onClick={() => onPlanViewChange("month")}
            className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
              planView === "month" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            Monatsplan
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={planView === "week"}
            onClick={() => onPlanViewChange("week")}
            className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
              planView === "week" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            Wochen-Board
          </button>
        </div>
      </div>

      {planView === "week" ? (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide" role="tablist" aria-label="Kalenderwochen">
          {calendarWeeks.map((monday) => {
            const iso = isoFromPlannerDate(monday);
            const active = iso === activeMondayIso;
            return (
              <button
                key={iso}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectMonday(monday)}
                className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-left transition ${
                  active
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted/30"
                }`}
              >
                <span className="block text-[11px] font-semibold tabular-nums">{shortWeekRangeLabel(monday)}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
