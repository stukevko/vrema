"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Clock3, Printer, Sparkles } from "lucide-react";
import {
  dateForPlannerCycleDay,
  formatPlannerWeekRange,
  mondayOfWeekContaining,
} from "@/lib/planning/cycle-display-date";
import { getWeekCycleIndex } from "@/lib/shift-cycle";
import { formatShiftRange, shiftCardTone, shiftSlotLabel } from "@/lib/planning/shift-display";
import { Button } from "@/components/ui/Button";
import { comparePlannerShifts } from "@/lib/planning/sort-shifts";

const DAY_NAMES = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;
const DAY_NAMES_FULL = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"] as const;
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
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const defaultWeek = initialWeekIndex ?? getWeekCycleIndex(today, shiftCycleWeeks);
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

  const weekShifts = useMemo(
    () => shifts.filter((s) => s.weekIndex === selectedWeek),
    [shifts, selectedWeek],
  );

  const totalInWeek = weekShifts.length;

  const nextShiftLabel = useMemo(() => {
    const upcoming = [...weekShifts]
      .filter((s) => {
        const wk = Math.min(3, Math.max(1, s.weekIndex)) as 1 | 2 | 3;
        const when = dateForPlannerCycleDay(wk, s.dayOfWeek);
        return when.getTime() >= todayStart.getTime();
      })
      .sort((a, b) => comparePlannerShifts(a, b));
    const next = upcoming[0];
    if (!next) return null;
    const when = dateForPlannerCycleDay(
      Math.min(3, Math.max(1, next.weekIndex)) as 1 | 2 | 3,
      next.dayOfWeek,
    );
    const dayName = isSameCalendarDay(when, today)
      ? "Heute"
      : DAY_NAMES_FULL[next.dayOfWeek];
    return `${dayName}, ${formatShiftRange(next.startTime, next.endTime)} Uhr`;
  }, [weekShifts, todayStart]);

  return (
    <section className="employee-schedule-print glass-card relative overflow-hidden p-4 sm:p-6">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/15"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-brand/12 blur-3xl"
      />

      <div className="no-print relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {companyName?.trim() ? (
            <p className="text-[10px] font-semibold uppercase tracking-widest text-brand">{companyName.trim()}</p>
          ) : null}
          <h2 className="mt-1 flex items-center gap-2 text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
            <CalendarDays className="h-5 w-5 shrink-0 text-brand" aria-hidden />
            Dein Wochenplan
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{weekRangeLabel}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          leadingIcon={<Printer className="h-4 w-4" />}
          onClick={() => window.print()}
          className="shrink-0 self-start"
        >
          Drucken / PDF
        </Button>
      </div>

      <div className="no-print relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface/80 px-3 py-2.5 dark:border-white/10">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Einsätze</p>
          <p className="mt-0.5 text-xl font-extrabold tabular-nums text-foreground">
            {totalInWeek}
            <span className="ml-1 text-sm font-semibold text-muted-foreground">
              {totalInWeek === 1 ? "Tag" : "Tage"}
            </span>
          </p>
        </div>
        <div className="col-span-2 rounded-2xl border border-brand/25 bg-brand-soft/50 px-3 py-2.5 sm:col-span-1 dark:border-white/10 dark:bg-brand/15">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-brand">
            <Clock3 className="h-3 w-3" aria-hidden />
            Nächster Dienst
          </p>
          <p className="mt-0.5 text-sm font-bold leading-snug text-foreground">
            {nextShiftLabel ?? "Diese Woche frei"}
          </p>
        </div>
      </div>

      {shiftCycleWeeks > 1 ? (
        <div
          className="no-print mt-4 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface-muted/80 p-1 scrollbar-hide dark:border-white/10"
          role="tablist"
          aria-label="Schichtzyklus-Woche"
        >
          {Array.from({ length: shiftCycleWeeks }).map((_, idx) => {
            const week = (idx + 1) as 1 | 2 | 3;
            const isCurrent = week === getWeekCycleIndex(today, shiftCycleWeeks);
            const active = selectedWeek === week;
            return (
              <button
                key={week}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedWeek(week)}
                className={`min-h-11 min-w-[5.5rem] flex-1 touch-manipulation rounded-xl px-3 py-2 text-center text-xs font-semibold transition-all sm:min-h-9 ${
                  active
                    ? "bg-brand text-brand-foreground shadow-[var(--shadow-button)]"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground"
                }`}
              >
                Woche {week}
                {isCurrent ? (
                  <span className={`mt-0.5 block text-[10px] font-medium ${active ? "text-brand-foreground/90" : "text-brand"}`}>
                    aktuell
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <p className="print-only mt-3 text-sm font-semibold text-foreground">
        {companyName?.trim() ? `${companyName.trim()} — ` : ""}
        Dienstplan Woche {selectedWeek} ({weekRangeLabel})
      </p>

      {totalInWeek === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-brand/30 bg-brand-soft/40 px-4 py-8 text-center dark:border-white/10 dark:bg-brand/12">
          <Sparkles className="mx-auto h-8 w-8 text-brand opacity-80" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-foreground">Noch nichts eingeplant</p>
          <p className="mt-1 text-xs text-muted-foreground">
            In Woche {selectedWeek} steht für dich noch kein Dienst — bei Fragen kurz die Führung ansprechen.
          </p>
        </div>
      ) : (
        <div className="no-print mt-4 -mx-1 overflow-x-auto px-1 pb-1 scrollbar-hide sm:mx-0 sm:overflow-visible sm:px-0">
          <div className="flex min-w-min gap-2 sm:grid sm:min-w-0 sm:grid-cols-7 sm:gap-2">
            {PLANNER_DAYS_MON_FIRST.map((dayOfWeek) => {
              const cellDate = dateForPlannerCycleDay(selectedWeek, dayOfWeek);
              const isToday = isSameCalendarDay(cellDate, today);
              const shift = shiftsByDay.get(dayOfWeek);
              const shortDate = cellDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
              const tone = shift ? shiftCardTone(shift.startTime, false) : "";

              return (
                <div
                  key={dayOfWeek}
                  className={`flex w-[4.75rem] shrink-0 flex-col rounded-2xl border p-2.5 sm:w-auto sm:min-h-[7.5rem] sm:p-3 ${
                    isToday
                      ? "border-brand/50 ring-2 ring-brand/20"
                      : shift
                        ? tone
                        : "border-line/70 bg-muted/15 dark:border-white/8"
                  } ${isToday && !shift ? "bg-brand-soft/40" : ""}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">
                      {DAY_NAMES[dayOfWeek]}
                    </p>
                    {isToday ? (
                      <span className="rounded-full bg-brand px-1.5 py-0.5 text-[8px] font-bold uppercase text-brand-foreground">
                        Heute
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] tabular-nums opacity-70">{shortDate}</p>
                  {shift ? (
                    <div className="mt-auto pt-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                        {shiftSlotLabel(shift.startTime)}
                      </p>
                      <p className="mt-0.5 text-sm font-extrabold tabular-nums leading-tight">
                        {formatShiftRange(shift.startTime, shift.endTime)}
                      </p>
                      {(shift.breakDuration ?? 0) > 0 ? (
                        <p className="mt-0.5 text-[9px] opacity-70">Pause {shift.breakDuration}m</p>
                      ) : null}
                      {shift.isOpenForTrade ? (
                        <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-warning-foreground">
                          Tausch
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-auto pt-3 text-xs font-medium opacity-50">Frei</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="relative mt-4 text-[11px] text-muted-foreground">
        {shiftCycleWeeks > 1
          ? "Wische die Tage auf dem Handy. Oben wechselst du den Zyklus (Woche 1–3)."
          : "Farben: Früh (gold), Tag (blau), Spät (violett), Nacht (grau)."}
      </p>
    </section>
  );
}
