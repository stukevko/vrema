"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatPlannerWeekRange } from "@/lib/planning/cycle-display-date";

type PlannerPeriodNavProps = {
  planCalendarMonday: Date;
  onShiftWeek: (delta: -1 | 1) => void;
  cycleWeekLabel?: string | null;
};

export function PlannerPeriodNav({ planCalendarMonday, onShiftWeek, cycleWeekLabel }: PlannerPeriodNavProps) {
  const weekLabel = useMemo(() => formatPlannerWeekRange(planCalendarMonday), [planCalendarMonday]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/10 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">{weekLabel}</p>
        {cycleWeekLabel ? (
          <p className="text-[11px] text-muted-foreground">{cycleWeekLabel}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onShiftWeek(-1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted/40"
          aria-label="Vorherige Woche"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onShiftWeek(1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted/40"
          aria-label="Nächste Woche"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
