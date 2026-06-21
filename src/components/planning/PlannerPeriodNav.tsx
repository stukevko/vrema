"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthYearLabel } from "@/lib/planning/cycle-display-date";

type PlannerPeriodNavProps = {
  monthAnchor: Date;
  onShiftMonth: (delta: -1 | 1) => void;
  onGoToday: () => void;
};

export function PlannerPeriodNav({ monthAnchor, onShiftMonth, onGoToday }: PlannerPeriodNavProps) {
  const monthLabel = useMemo(() => monthYearLabel(monthAnchor), [monthAnchor]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
      <h2 className="text-xl font-bold capitalize tracking-tight text-foreground sm:text-2xl">{monthLabel}</h2>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onShiftMonth(-1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-muted/50"
          aria-label="Vorheriger Monat"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onShiftMonth(1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-muted/50"
          aria-label="Nächster Monat"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onGoToday}
          className="ml-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-brand-soft"
        >
          Heute
        </button>
      </div>
    </div>
  );
}
