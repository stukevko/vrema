"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  calendarWeeksForMonth,
  isoFromPlannerDate,
  monthYearLabel,
  shortWeekRangeLabel,
} from "@/lib/planning/cycle-display-date";
import { getWeekCycleIndex, type ShiftCycleWeeks } from "@/lib/shift-cycle";

export type PlannerPlanView = "week" | "month";

type PlannerPeriodNavProps = {
  planCalendarMonday: Date;
  planView: PlannerPlanView;
  shiftCycleWeeks: ShiftCycleWeeks;
  onSelectMonday: (monday: Date) => void;
  onPlanViewChange: (view: PlannerPlanView) => void;
  onShiftMonth: (delta: -1 | 1) => void;
};

export function PlannerPeriodNav({
  planCalendarMonday,
  planView,
  shiftCycleWeeks,
  onSelectMonday,
  onPlanViewChange,
  onShiftMonth,
}: PlannerPeriodNavProps) {
  const monthLabel = useMemo(() => monthYearLabel(planCalendarMonday), [planCalendarMonday]);
  const calendarWeeks = useMemo(() => calendarWeeksForMonth(planCalendarMonday), [planCalendarMonday]);
  const activeMondayIso = isoFromPlannerDate(planCalendarMonday);

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onShiftMonth(-1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-foreground shadow-sm transition hover:bg-muted/50"
            aria-label="Vorheriger Monat"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <p className="min-w-[9rem] px-2 text-center text-sm font-semibold capitalize text-foreground">{monthLabel}</p>
          <button
            type="button"
            onClick={() => onShiftMonth(1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-foreground shadow-sm transition hover:bg-muted/50"
            aria-label="Nächster Monat"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div
          className="inline-flex rounded-xl border border-border bg-surface-muted/60 p-0.5 shadow-sm"
          role="tablist"
          aria-label="Planungsansicht"
        >
          {(["week", "month"] as const).map((view) => {
            const active = planView === view;
            return (
              <button
                key={view}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onPlanViewChange(view)}
                className={`min-h-9 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  active ? "bg-brand text-brand-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {view === "week" ? "Woche" : "Monat"}
              </button>
            );
          })}
        </div>
      </div>

      {planView === "week" ? (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Kalenderwochen">
          {calendarWeeks.map((monday) => {
            const iso = isoFromPlannerDate(monday);
            const active = iso === activeMondayIso;
            const patternWeek = getWeekCycleIndex(monday, shiftCycleWeeks);
            return (
              <button
                key={iso}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectMonday(monday)}
                className={`flex min-h-11 min-w-[7.5rem] flex-col items-start rounded-xl border px-3 py-2 text-left transition ${
                  active
                    ? "border-brand/50 bg-brand text-brand-foreground shadow-sm"
                    : "border-border bg-background text-foreground hover:border-border-strong hover:bg-muted/30"
                }`}
              >
                <span className="text-xs font-semibold tabular-nums">{shortWeekRangeLabel(monday)}</span>
                {shiftCycleWeeks > 1 ? (
                  <span className={`text-[10px] ${active ? "text-brand-foreground/85" : "text-muted-foreground"}`}>
                    Zyklus Woche {patternWeek}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] leading-snug text-muted-foreground">
          Monatsüberblick — Tag antippen springt in die Wochenansicht.{" "}
          {shiftCycleWeeks > 1
            ? `Dein Betrieb plant im ${shiftCycleWeeks}-Wochen-Rhythmus; die Farben zeigen geplante Schichten pro Tag.`
            : null}
        </p>
      )}
    </div>
  );
}
