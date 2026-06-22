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

type AbsenceDayChip = {
  userId: string;
  isoDate: string;
  type: "VACATION" | "SICK";
};

type PlannerMonthGridProps = {
  monthAnchor: Date;
  shiftCycleWeeks: ShiftCycleWeeks;
  shifts: BoardShiftRow[];
  members: BoardMember[];
  absenceDays?: AbsenceDayChip[];
  holidayRegion?: GermanRegion | null;
  onAddShift: (iso: string) => void;
  onEditShift: (shift: BoardShiftRow, iso: string) => void;
};

function formatDayNumber(date: Date, inMonth: boolean, isFirstOfMonth: boolean): string {
  if (!inMonth) return String(date.getDate());
  if (isFirstOfMonth) {
    return date.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
  }
  return String(date.getDate());
}

function formatShiftTime(startTime: string, endTime: string): string {
  return `${startTime.slice(0, 5)}–${endTime.slice(0, 5)}`;
}

export function PlannerMonthGrid({
  monthAnchor,
  shiftCycleWeeks,
  shifts,
  members,
  absenceDays = [],
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

  const absencesByIso = useMemo(() => {
    const map = new Map<string, Array<{ userId: string; type: "VACATION" | "SICK"; label: string }>>();
    for (const entry of absenceDays) {
      const label = (memberLabelById.get(entry.userId) ?? "MA").split(/\s+/)[0] ?? "MA";
      const list = map.get(entry.isoDate) ?? [];
      list.push({ userId: entry.userId, type: entry.type, label });
      map.set(entry.isoDate, list);
    }
    return map;
  }, [absenceDays, memberLabelById]);

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
    <div className="overflow-hidden rounded-[1.25rem] border border-border/50 bg-card shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_30px_-16px_rgba(0,0,0,0.12)]">
      <div className="grid grid-cols-7 border-b border-border/40 bg-muted/15">
        {DOW_LABELS.map((label, idx) => (
          <div
            key={label}
            className={`py-2.5 text-center text-[11px] font-semibold ${
              idx >= 5 ? "text-muted-foreground/70" : "text-muted-foreground"
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      <div>
        {weeks.map((weekMonday, weekIdx) => {
          const weekIso = isoFromPlannerDate(weekMonday);
          return (
            <div
              key={weekIso}
              className={`grid grid-cols-7 ${weekIdx > 0 ? "border-t border-border/35" : ""}`}
            >
              {MON_FIRST_DOW.map((dow, colIdx) => {
                const date = new Date(weekMonday);
                date.setDate(weekMonday.getDate() + dayOrderMonFirst(dow));
                const iso = isoFromPlannerDate(date);
                const inMonth = date.getMonth() === displayMonth && date.getFullYear() === displayYear;
                const isToday = iso === todayIso;
                const isFirstOfMonth = inMonth && date.getDate() === 1;
                const isWeekend = colIdx >= 5;
                const dayShifts = shiftsByIso.get(iso) ?? [];
                const dayAbsences = absencesByIso.get(iso) ?? [];
                const holidayName =
                  holidayRegion != null
                    ? (holidaysByIso.get(iso) ?? getHolidayForDate(iso, holidayRegion)?.name ?? null)
                    : null;

                return (
                  <div
                    key={`${weekIso}-${dow}`}
                    className={`group relative flex min-h-[5.25rem] flex-col border-r border-border/35 p-1.5 text-left last:border-r-0 sm:min-h-[6.75rem] sm:p-2 ${
                      inMonth
                        ? isWeekend
                          ? "bg-muted/[0.08]"
                          : "bg-card"
                        : "bg-muted/[0.04]"
                    } ${isToday && inMonth ? "ring-1 ring-inset ring-red-500/15" : ""}`}
                  >
                    <div className="mb-1 flex shrink-0 justify-end">
                      {isToday ? (
                        <span className="inline-flex h-[1.35rem] min-w-[1.35rem] items-center justify-center rounded-full bg-[#FF3B30] px-1 text-[11px] font-bold tabular-nums text-white shadow-sm">
                          {date.getDate()}
                        </span>
                      ) : (
                        <span
                          className={`text-[11px] tabular-nums sm:text-xs ${
                            inMonth
                              ? isFirstOfMonth
                                ? "font-semibold text-foreground"
                                : "font-medium text-foreground/90"
                              : "font-normal text-muted-foreground/35"
                          }`}
                        >
                          {formatDayNumber(date, inMonth, isFirstOfMonth)}
                        </span>
                      )}
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-[3px] overflow-hidden">
                      {holidayName && inMonth ? (
                        <span
                          className="truncate rounded-[5px] bg-[#5856D6] px-1.5 py-[3px] text-[10px] font-medium leading-none text-white shadow-sm"
                          title={holidayName}
                        >
                          {holidayName}
                        </span>
                      ) : null}
                      {dayAbsences.slice(0, inMonth ? 2 : 0).map((absence) => (
                        <span
                          key={`${absence.userId}-${iso}`}
                          className={`truncate rounded-[5px] px-1.5 py-[3px] text-[10px] font-semibold leading-none shadow-sm ${
                            absence.type === "SICK"
                              ? "bg-[#FF3B30] text-white"
                              : "bg-amber-500 text-white"
                          }`}
                          title={absence.type === "SICK" ? `${absence.label} · Krank` : `${absence.label} · Urlaub`}
                        >
                          {absence.label} {absence.type === "SICK" ? "krank" : "Urlaub"}
                        </span>
                      ))}
                      {dayShifts.slice(0, inMonth ? Math.max(0, 3 - dayAbsences.length) : 0).map((shift) => {
                        const label = memberLabelById.get(shift.userId) ?? "Schicht";
                        const shortLabel = label.split(/\s+/)[0] ?? label;
                        return (
                          <span
                            key={shift.id}
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditShift(shift, iso);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                onEditShift(shift, iso);
                              }
                            }}
                            className="truncate rounded-[5px] bg-[#007AFF] px-1.5 py-[3px] text-[10px] font-medium leading-none text-white shadow-sm transition hover:brightness-110"
                            title={`${label} · ${formatShiftTime(shift.startTime, shift.endTime)}`}
                          >
                            {shortLabel} {formatShiftTime(shift.startTime, shift.endTime)}
                          </span>
                        );
                      })}
                      {inMonth && dayShifts.length + dayAbsences.length > 3 ? (
                        <span className="px-0.5 text-[10px] font-medium text-muted-foreground">
                          +{dayShifts.length + dayAbsences.length - 3}
                        </span>
                      ) : null}
                    </div>

                    {inMonth ? (
                      <button
                        type="button"
                        onClick={() => onAddShift(iso)}
                        className="mt-auto w-full rounded-md py-0.5 text-[10px] font-semibold text-brand opacity-80 transition hover:bg-brand-soft hover:opacity-100"
                      >
                        + Schicht
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
