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
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-[1.65rem] font-bold capitalize leading-none tracking-tight text-foreground">{monthLabel}</h2>
      <div className="flex items-center gap-1.5">
        <div className="inline-flex items-center rounded-full bg-muted/50 p-0.5">
          <button
            type="button"
            onClick={() => onShiftMonth(-1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground transition hover:bg-background/80"
            aria-label="Vorheriger Monat"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onShiftMonth(1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground transition hover:bg-background/80"
            aria-label="Nächster Monat"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <button
          type="button"
          onClick={onGoToday}
          className="rounded-full bg-muted/50 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
        >
          Heute
        </button>
      </div>
    </div>
  );
}
