"use client";

import { useMemo } from "react";
import {
  calendarWeeksForMonth,
  dayOrderMonFirst,
  isoFromPlannerDate,
} from "@/lib/planning/cycle-display-date";
import type { BoardMember, BoardShiftRow } from "@/lib/planning/shift-board-model";
import { getHolidayForDate, listHolidays, type GermanRegion } from "@/lib/holidays/de";
import { getWeekCycleIndex, type ShiftCycleWeeks } from "@/lib/shift-cycle";

const DOW_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;
const MON_FIRST_DOW = [1, 2, 3, 4, 5, 6, 0] as const;

type PlannerMonthGridProps = {
  monthAnchor: Date;
  shiftCycleWeeks: ShiftCycleWeeks;
  shifts: BoardShiftRow[];
  members: BoardMember[];
  holidayRegion?: GermanRegion | null;
  onAddShift: (iso: string) => void;
  onEditShift: (shift: BoardShiftRow) => void;
};

function formatDayNumber(date: Date, inMonth: boolean, isFirstOfMonth: boolean): string {
  if (!inMonth) return String(date.getDate());
  if (isFirstOfMonth) {
    return date.toLocaleDateString("de-DE", { day: "numeric", month: "long" });
  }
  return String(date.getDate());
}

function formatShiftTime(startTime: string, endTime: string): string {
  const s = startTime.slice(0, 5);
  const e = endTime.slice(0, 5);
  return `${s}–${e}`;
}

export function PlannerMonthGrid({
  monthAnchor,
  shiftCycleWeeks,
  shifts,
  members,
  holidayRegion,
  onAddShift,
  onEditShift,
}: PlannerMonthGridProps) {
  const displayMonth = monthAnchor.getMonth();
  const displayYear = monthAnchor.getFullYear();
  const weeks = useMemo(() => calendarWeeksForMonth(monthAnchor), [monthAnchor]);
  const todayIso = isoFromPlannerDate(new Date());

  const memberLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      map.set(m.id, (m.name ?? m.email).trim());
    }
    return map;
  }, [members]);

  const holidaysByIso = useMemo(() => {
    if (!holidayRegion) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const h of listHolidays(displayYear, holidayRegion)) {
      map.set(h.date, h.name);
    }
    if (displayMonth === 0) {
      for (const h of listHolidays(displayYear - 1, holidayRegion)) {
        map.set(h.date, h.name);
      }
    }
    if (displayMonth === 11) {
      for (const h of listHolidays(displayYear + 1, holidayRegion)) {
        map.set(h.date, h.name);
      }
    }
    return map;
  }, [displayYear, displayMonth, holidayRegion]);

  const shiftsByIso = useMemo(() => {
    const map = new Map<string, BoardShiftRow[]>();
    for (const weekMonday of weeks) {
      for (const dow of MON_FIRST_DOW) {
        const date = new Date(weekMonday);
        date.setDate(weekMonday.getDate() + dayOrderMonFirst(dow));
        const iso = isoFromPlannerDate(date);
        const weekIndex = getWeekCycleIndex(date, shiftCycleWeeks);
        const dayShifts = shifts.filter(
          (s) => s.weekIndex === weekIndex && s.dayOfWeek === dow && !s.isDraft,
        );
        if (dayShifts.length > 0) {
          map.set(iso, dayShifts);
        }
      }
    }
    return map;
  }, [weeks, shifts, shiftCycleWeeks]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border/80">
        {DOW_LABELS.map((label) => (
          <div
            key={label}
            className="border-r border-border/60 py-2 text-center text-[11px] font-medium text-muted-foreground last:border-r-0"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="divide-y divide-border/80">
        {weeks.map((weekMonday) => {
          const weekIso = isoFromPlannerDate(weekMonday);
          return (
            <div key={weekIso} className="grid grid-cols-7 divide-x divide-border/60">
              {MON_FIRST_DOW.map((dow) => {
                const date = new Date(weekMonday);
                date.setDate(weekMonday.getDate() + dayOrderMonFirst(dow));
                const iso = isoFromPlannerDate(date);
                const inMonth = date.getMonth() === displayMonth && date.getFullYear() === displayYear;
                const isToday = iso === todayIso;
                const isFirstOfMonth = inMonth && date.getDate() === 1;
                const dayShifts = shiftsByIso.get(iso) ?? [];
                const holidayName =
                  holidayRegion != null
                    ? (holidaysByIso.get(iso) ?? getHolidayForDate(iso, holidayRegion)?.name ?? null)
                    : null;

                return (
                  <button
                    key={`${weekIso}-${dow}`}
                    type="button"
                    onClick={() => onAddShift(iso)}
                    className={`group relative flex min-h-[4.5rem] flex-col items-stretch p-1 text-left transition sm:min-h-[5.5rem] sm:p-1.5 ${
                      inMonth
                        ? "bg-card hover:bg-muted/20"
                        : "cursor-default bg-muted/5 text-muted-foreground/35 hover:bg-muted/5"
                    }`}
                  >
                    <div className="mb-0.5 flex shrink-0 items-start justify-end px-0.5">
                      {isToday ? (
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold tabular-nums text-white">
                          {date.getDate()}
                        </span>
                      ) : (
                        <span
                          className={`text-[11px] tabular-nums sm:text-xs ${
                            inMonth ? "font-medium text-foreground" : "text-muted-foreground/40"
                          } ${isFirstOfMonth ? "text-[10px] font-semibold sm:text-[11px]" : ""}`}
                        >
                          {formatDayNumber(date, inMonth, isFirstOfMonth)}
                        </span>
                      )}
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                      {holidayName ? (
                        <span
                          className="truncate rounded px-1 py-0.5 text-[9px] font-medium leading-tight text-violet-100 sm:text-[10px]"
                          style={{ backgroundColor: "rgb(88, 86, 214)" }}
                          title={holidayName}
                        >
                          {holidayName}
                        </span>
                      ) : null}
                      {dayShifts.slice(0, inMonth ? 3 : 0).map((shift) => {
                        const label = memberLabelById.get(shift.userId) ?? "Schicht";
                        const shortLabel = label.split(" ")[0] ?? label;
                        return (
                          <span
                            key={shift.id}
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditShift(shift);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                onEditShift(shift);
                              }
                            }}
                            className="truncate rounded px-1 py-0.5 text-[9px] font-medium leading-tight text-white sm:text-[10px]"
                            style={{ backgroundColor: "rgb(0, 122, 255)" }}
                            title={`${label} · ${formatShiftTime(shift.startTime, shift.endTime)}`}
                          >
                            {shortLabel} {formatShiftTime(shift.startTime, shift.endTime)}
                          </span>
                        );
                      })}
                      {inMonth && dayShifts.length > 3 ? (
                        <span className="px-0.5 text-[9px] font-medium text-muted-foreground">
                          +{dayShifts.length - 3} weitere
                        </span>
                      ) : null}
                    </div>
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
