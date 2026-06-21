"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  calendarWeeksForMonth,
  formatPlannerWeekRange,
  isoFromPlannerDate,
  shortWeekRangeLabel,
} from "@/lib/planning/cycle-display-date";

type PlannerPeriodNavProps = {
  planCalendarMonday: Date;
  onSelectMonday: (monday: Date) => void;
  onShiftWeek: (delta: -1 | 1) => void;
};

export function PlannerPeriodNav({ planCalendarMonday, onSelectMonday, onShiftWeek }: PlannerPeriodNavProps) {
  const weekLabel = useMemo(() => formatPlannerWeekRange(planCalendarMonday), [planCalendarMonday]);
  const calendarWeeks = useMemo(() => calendarWeeksForMonth(planCalendarMonday), [planCalendarMonday]);
  const activeMondayIso = isoFromPlannerDate(planCalendarMonday);

  return (
    <div className="space-y-2.5">
      <div className="surface-panel rounded-xl px-3 py-2 text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground">So geht&apos;s:</span> Person links wählen → in den Tag ziehen
        oder „+ Schicht“. Fertig planen → PDF unten fürs Team.
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onShiftWeek(-1)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted/40"
            aria-label="Vorherige Woche"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <p className="min-w-0 px-2 text-center text-sm font-bold text-foreground">{weekLabel}</p>
          <button
            type="button"
            onClick={() => onShiftWeek(1)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted/40"
            aria-label="Nächste Woche"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

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
    </div>
  );
}
