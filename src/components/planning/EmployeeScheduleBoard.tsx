"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Printer } from "lucide-react";
import {
  dateForPlannerCycleDay,
  formatPlannerWeekRange,
  mondayOfWeekContaining,
} from "@/lib/planning/cycle-display-date";
import { getWeekCycleIndex } from "@/lib/shift-cycle";
import { formatShiftRange } from "@/lib/planning/shift-display";

const DAY_NAMES = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"] as const;
const PLANNER_DAYS_MON_FIRST = [1, 2, 3, 4, 5, 6, 0] as const;

export type EmployeeShiftRow = {
  id: string;
  weekIndex: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakDuration?: number;
  isOpenForTrade?: boolean;
};

type Props = {
  shifts: EmployeeShiftRow[];
  shiftCycleWeeks: 1 | 2 | 3;
  companyName?: string;
  initialWeekIndex?: 1 | 2 | 3;
};

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

export function EmployeeScheduleBoard({
  shifts,
  shiftCycleWeeks,
  companyName,
  initialWeekIndex,
}: Props) {
  const today = new Date();
  const defaultWeek =
    initialWeekIndex ?? getWeekCycleIndex(today, shiftCycleWeeks);
  const [selectedWeek, setSelectedWeek] = useState<1 | 2 | 3>(defaultWeek);

  const weekRangeLabel = useMemo(() => {
    const monday = mondayOfWeekContaining(new Date());
    const weekMonday = new Date(monday);
    weekMonday.setDate(monday.getDate() + (selectedWeek - 1) * 7);
    return formatPlannerWeekRange(weekMonday);
  }, [selectedWeek]);

  const shiftsByDay = useMemo(() => {
    const map = new Map<number, EmployeeShiftRow>();
    for (const s of shifts) {
      if (s.weekIndex === selectedWeek) map.set(s.dayOfWeek, s);
    }
    return map;
  }, [shifts, selectedWeek]);

  const totalInWeek = PLANNER_DAYS_MON_FIRST.filter((d) => shiftsByDay.has(d)).length;

  return (
    <section className="employee-schedule-print glass-card overflow-hidden p-4 sm:p-5">
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <CalendarDays className="h-4 w-4 text-brand" aria-hidden />
            Dein Wochenüberblick
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{weekRangeLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted/40"
        >
          <Printer className="h-3.5 w-3.5" aria-hidden />
          Drucken / PDF speichern
        </button>
      </div>

      {shiftCycleWeeks > 1 ? (
        <div className="no-print mt-4 inline-flex max-w-full rounded-lg border border-border bg-background p-1 text-xs">
          {Array.from({ length: shiftCycleWeeks }).map((_, idx) => {
            const week = (idx + 1) as 1 | 2 | 3;
            const isCurrent = week === getWeekCycleIndex(today, shiftCycleWeeks);
            return (
              <button
                key={week}
                type="button"
                onClick={() => setSelectedWeek(week)}
                className={`min-h-10 touch-manipulation rounded-md px-4 py-2 sm:min-h-0 sm:px-3 sm:py-1.5 ${
                  selectedWeek === week
                    ? "bg-brand text-brand-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Woche {week}
                {isCurrent ? " · jetzt" : ""}
              </button>
            );
          })}
        </div>
      ) : null}

      <p className="print-only mt-2 text-sm font-semibold text-foreground">
        {companyName?.trim() ? `${companyName.trim()} — ` : ""}
        Dienstplan Woche {selectedWeek} ({weekRangeLabel})
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {PLANNER_DAYS_MON_FIRST.map((dayOfWeek) => {
          const cellDate = dateForPlannerCycleDay(selectedWeek, dayOfWeek);
          const isToday = isSameCalendarDay(cellDate, today);
          const shift = shiftsByDay.get(dayOfWeek);
          const shortDate = cellDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
          return (
            <div
              key={dayOfWeek}
              className={`flex min-h-[5.5rem] flex-col rounded-2xl border px-2.5 py-2.5 sm:min-h-[6.5rem] ${
                isToday
                  ? "border-brand/50 bg-brand-soft/60 ring-2 ring-brand/25"
                  : shift
                    ? "border-brand/25 bg-surface shadow-sm dark:border-white/10"
                    : "border-line/80 bg-muted/20 dark:border-white/8"
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {DAY_NAMES[dayOfWeek].slice(0, 2)}
              </p>
              <p className="text-[11px] tabular-nums text-muted-foreground">{shortDate}</p>
              {shift ? (
                <>
                  <p className="mt-auto font-sans text-sm font-bold tabular-nums leading-tight text-brand sm:text-base">
                    {formatShiftRange(shift.startTime, shift.endTime)} Uhr
                  </p>
                  {(shift.breakDuration ?? 0) > 0 ? (
                    <p className="text-[10px] text-muted-foreground">Pause {shift.breakDuration} Min</p>
                  ) : null}
                  {shift.isOpenForTrade ? (
                    <p className="text-[10px] font-medium text-warning-foreground">Tausch offen</p>
                  ) : null}
                </>
              ) : (
                <p className="mt-auto text-xs font-medium text-muted-foreground">Frei</p>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        {totalInWeek === 0
          ? "In dieser Zyklus-Woche bist du noch nicht eingeplant."
          : `${totalInWeek} Einsatz${totalInWeek === 1 ? "" : "e"} in Woche ${selectedWeek}.`}
        {shiftCycleWeeks > 1 ? " Wechsle oben die Woche, um den ganzen Schichtzyklus zu sehen." : null}
      </p>
    </section>
  );
}
