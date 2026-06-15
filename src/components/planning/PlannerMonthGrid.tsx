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
  shiftCycleWeeks: ShiftCycleWeeks;
  shifts: BoardShiftRow[];
  onSelectDay: (monday: Date, iso: string) => void;
};

function countShiftsOnDate(shifts: BoardShiftRow[], date: Date, cycleWeeks: ShiftCycleWeeks): number {
  const weekIndex = getWeekCycleIndex(date, cycleWeeks);
  const dayOfWeek = date.getDay();
  return shifts.filter((s) => s.weekIndex === weekIndex && s.dayOfWeek === dayOfWeek && !s.isDraft).length;
}

export function PlannerMonthGrid({
  planCalendarMonday,
  shiftCycleWeeks,
  shifts,
  onSelectDay,
}: PlannerMonthGridProps) {
  const monthAnchor = planCalendarMonday;
  const weeks = useMemo(() => calendarWeeksForMonth(monthAnchor), [monthAnchor]);
  const todayIso = isoFromPlannerDate(new Date());
  const activeMondayIso = isoFromPlannerDate(planCalendarMonday);
  const displayMonth = monthAnchor.getMonth();

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border-2 border-border bg-background shadow-sm">
      <div className="border-b border-border bg-surface-muted/40 px-4 py-2.5">
        <p className="text-sm font-semibold capitalize text-foreground">{monthYearLabel(monthAnchor)}</p>
        <p className="text-[11px] text-muted-foreground">Punkte = geplante Schichten · Tag antippen für Details</p>
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-muted/20 text-center">
        {DOW_LABELS.map((label) => (
          <div key={label} className="border-r border-border py-1.5 text-[10px] font-bold uppercase text-muted-foreground last:border-r-0">
            {label}
          </div>
        ))}
      </div>

      <div className="divide-y divide-border">
        {weeks.map((weekMonday) => {
          const weekIso = isoFromPlannerDate(weekMonday);
          const isActiveWeek = weekIso === activeMondayIso;
          return (
            <div
              key={weekIso}
              className={`grid grid-cols-7 ${isActiveWeek ? "bg-brand-soft/25 ring-1 ring-inset ring-brand/25" : ""}`}
            >
              {MON_FIRST_DOW.map((dow) => {
                const date = new Date(weekMonday);
                date.setDate(weekMonday.getDate() + dayOrderMonFirst(dow));
                const iso = isoFromPlannerDate(date);
                const inMonth = date.getMonth() === displayMonth;
                const count = inMonth ? countShiftsOnDate(shifts, date, shiftCycleWeeks) : 0;
                const isToday = iso === todayIso;
                return (
                  <button
                    key={`${weekIso}-${dow}`}
                    type="button"
                    disabled={!inMonth}
                    onClick={() => {
                      if (!inMonth) return;
                      onSelectDay(weekMonday, iso);
                    }}
                    className={`relative flex min-h-[2.75rem] flex-col items-center justify-center border-r border-border px-0.5 py-1 text-center transition last:border-r-0 sm:min-h-[3.25rem] ${
                      inMonth
                        ? "hover:bg-muted/40"
                        : "cursor-default bg-muted/10 text-muted-foreground/40"
                    } ${isToday ? "ring-1 ring-inset ring-brand/50" : ""}`}
                  >
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        inMonth ? "text-foreground" : "text-muted-foreground/50"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {count > 0 ? (
                      <span className="mt-0.5 flex items-center gap-0.5" aria-label={`${count} Schichten`}>
                        {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                          <span key={i} className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
                        ))}
                        {count > 3 ? (
                          <span className="text-[9px] font-bold text-brand">+{count - 3}</span>
                        ) : null}
                      </span>
                    ) : inMonth ? (
                      <span className="mt-1 h-1 w-1 rounded-full bg-transparent" aria-hidden />
                    ) : null}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
