"use client";

import { useMemo } from "react";
import {
  calendarWeeksForMonth,
  dayOrderMonFirst,
  isoFromPlannerDate,
  monthYearLabel,
} from "@/lib/planning/cycle-display-date";
import type { BoardShiftRow } from "@/lib/planning/shift-board-model";
import { getWeekCycleIndex, type ShiftCycleWeeks } from "@/lib/shift-cycle";

const DOW_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;
const MON_FIRST_DOW = [1, 2, 3, 4, 5, 6, 0] as const;

type PlannerMonthGridProps = {
  planCalendarMonday: Date;
  selectedDayIso: string | null;
  shiftCycleWeeks: ShiftCycleWeeks;
  shifts: BoardShiftRow[];
  neededStaff: number;
  onSelectDay: (monday: Date, iso: string) => void;
};

function shiftsOnDate(shifts: BoardShiftRow[], date: Date, cycleWeeks: ShiftCycleWeeks): BoardShiftRow[] {
  const weekIndex = getWeekCycleIndex(date, cycleWeeks);
  const dayOfWeek = date.getDay();
  return shifts.filter((s) => s.weekIndex === weekIndex && s.dayOfWeek === dayOfWeek && !s.isDraft);
}

function dayTone(count: number, neededStaff: number): "empty" | "partial" | "ok" {
  if (count === 0) return "empty";
  if (count < neededStaff) return "partial";
  return "ok";
}

const TONE_CLASS = {
  empty: "bg-muted/30 text-muted-foreground",
  partial: "bg-warning-soft/60 text-warning-foreground ring-1 ring-warning/30",
  ok: "bg-success-soft/50 text-success-foreground ring-1 ring-success/25",
} as const;

export function PlannerMonthGrid({
  planCalendarMonday,
  selectedDayIso,
  shiftCycleWeeks,
  shifts,
  neededStaff,
  onSelectDay,
}: PlannerMonthGridProps) {
  const monthAnchor = planCalendarMonday;
  const weeks = useMemo(() => calendarWeeksForMonth(monthAnchor), [monthAnchor]);
  const todayIso = isoFromPlannerDate(new Date());
  const displayMonth = monthAnchor.getMonth();

  return (
    <div className="surface-panel sm:rounded-2xl">
      <div className="border-b border-border bg-surface-muted/30 px-3 py-2">
        <p className="text-xs font-semibold capitalize text-foreground">{monthYearLabel(monthAnchor)}</p>
        <p className="text-[10px] text-muted-foreground">Tag antippen → unten bearbeiten</p>
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-muted/15">
        {DOW_LABELS.map((label) => (
          <div
            key={label}
            className="border-r border-border/80 py-1 text-center text-[9px] font-bold uppercase text-muted-foreground last:border-r-0"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="divide-y divide-border/80">
        {weeks.map((weekMonday) => {
          const weekIso = isoFromPlannerDate(weekMonday);
          return (
            <div key={weekIso} className="grid grid-cols-7">
              {MON_FIRST_DOW.map((dow) => {
                const date = new Date(weekMonday);
                date.setDate(weekMonday.getDate() + dayOrderMonFirst(dow));
                const iso = isoFromPlannerDate(date);
                const inMonth = date.getMonth() === displayMonth;
                const dayShifts = inMonth ? shiftsOnDate(shifts, date, shiftCycleWeeks) : [];
                const count = dayShifts.length;
                const tone = inMonth ? dayTone(count, neededStaff) : "empty";
                const isToday = iso === todayIso;
                const isSelected = iso === selectedDayIso;
                return (
                  <button
                    key={`${weekIso}-${dow}`}
                    type="button"
                    disabled={!inMonth}
                    onClick={() => {
                      if (!inMonth) return;
                      onSelectDay(weekMonday, iso);
                    }}
                    className={`relative flex min-h-[2.5rem] flex-col items-center justify-center border-r border-border/60 px-0.5 py-1 transition last:border-r-0 sm:min-h-[2.85rem] ${
                      inMonth ? TONE_CLASS[tone] : "cursor-default bg-muted/5 text-muted-foreground/30"
                    } ${isSelected ? "!ring-2 !ring-inset !ring-brand" : ""} ${isToday && !isSelected ? "font-bold underline decoration-brand/50" : ""} ${
                      inMonth ? "hover:brightness-95" : ""
                    }`}
                  >
                    <span className={`text-[11px] tabular-nums ${inMonth ? "font-semibold" : ""}`}>{date.getDate()}</span>
                    {inMonth && count > 0 ? (
                      <span className="text-[8px] font-bold tabular-nums opacity-90">{count}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 border-t border-border bg-muted/10 px-3 py-1.5 text-[9px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-muted/40 ring-1 ring-border" /> leer
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-warning-soft ring-1 ring-warning/30" /> wenig besetzt
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-success-soft ring-1 ring-success/25" /> besetzt
        </span>
      </div>
    </div>
  );
}
