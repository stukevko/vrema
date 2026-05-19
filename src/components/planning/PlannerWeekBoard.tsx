"use client";

import { useMemo } from "react";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusTone } from "@/components/ui/StatusBadge";
import { StaffingHintBadge } from "@/components/planning/StaffingHintBadge";
import type { PlannerStaffingHint } from "@/lib/actions/predictive";
import type { DailyWeatherForecast } from "@/lib/weather/shared";
import { Cloud, CloudRain, CloudSun, HelpCircle, Plus, Sun } from "lucide-react";

const WEEK_SHORT_MON = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;
/** Mo … So als dayOfWeek (JS: 1=Mo … 0=So). */
const MON_FIRST_DOW = [1, 2, 3, 4, 5, 6, 0] as const;

type Member = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  weeklyHours?: number;
};

type ShiftRow = {
  id: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isDraft?: boolean;
};

function toMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function shiftDurationMinutes(start: string, end: string) {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) return 0;
  return endMinutes > startMinutes ? endMinutes - startMinutes : 24 * 60 - startMinutes + endMinutes;
}

function weatherIcon(day: DailyWeatherForecast | null, className: string) {
  if (!day) return <HelpCircle className={className} aria-hidden />;
  if (day.condition === "RAIN" || day.condition === "SNOW") return <CloudRain className={className} aria-hidden />;
  if (day.condition === "CLEAR") return <Sun className={className} aria-hidden />;
  if (day.condition === "CLOUDS") return <Cloud className={className} aria-hidden />;
  return <CloudSun className={className} aria-hidden />;
}

function shiftSlotClass(startTime: string) {
  const m = toMinutes(startTime);
  if (m === null || m < 12 * 60) {
    return "border-amber-300/70 bg-gradient-to-b from-amber-50 to-amber-100/80 text-amber-950 dark:border-amber-500/35 dark:from-amber-500/15 dark:to-amber-500/8 dark:text-amber-100";
  }
  if (m < 17 * 60) {
    return "border-sky-300/70 bg-gradient-to-b from-sky-50 to-sky-100/80 text-sky-950 dark:border-sky-500/35 dark:from-sky-500/15 dark:to-sky-500/8 dark:text-sky-100";
  }
  return "border-violet-300/70 bg-gradient-to-b from-violet-50 to-violet-100/80 text-violet-950 dark:border-violet-500/35 dark:from-violet-500/15 dark:to-violet-500/8 dark:text-violet-100";
}

function formatShortDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

export type PlannerWeekBoardProps = {
  members: Member[];
  shiftByUserAndDay: Map<string, ShiftRow>;
  selectedWeekIndex: number;
  neededStaff: number;
  planWeekRangeLabel: string;
  weatherWeek: Array<DailyWeatherForecast | null>;
  weekDayDates: string[];
  conflictTypeByCell: Map<string, "VACATION" | "SICK">;
  staffingHintByDay: Map<number, PlannerStaffingHint>;
  isPending: boolean;
  onEditShift: (userId: string, dayOfWeek: number, shift: ShiftRow, label: string) => void;
  onAddShift: (userId: string, dayOfWeek: number) => void;
  onOpenTimelineDay?: (dayOfWeek: number) => void;
};

export function PlannerWeekBoard({
  members,
  shiftByUserAndDay,
  selectedWeekIndex,
  neededStaff,
  planWeekRangeLabel,
  weatherWeek,
  weekDayDates,
  conflictTypeByCell,
  staffingHintByDay,
  isPending,
  onEditShift,
  onAddShift,
  onOpenTimelineDay,
}: PlannerWeekBoardProps) {
  const staffedByDay = MON_FIRST_DOW.map((dow) => {
    let n = 0;
    for (const m of members) {
      if (shiftByUserAndDay.has(`${m.id}-${selectedWeekIndex}-${dow}`)) n += 1;
    }
    return n;
  });

  const memberMinutes = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of members) map.set(m.id, 0);
    for (const [, shift] of shiftByUserAndDay) {
      if (!map.has(shift.userId)) continue;
      map.set(shift.userId, (map.get(shift.userId) ?? 0) + shiftDurationMinutes(shift.startTime, shift.endTime));
    }
    return map;
  }, [members, shiftByUserAndDay]);

  return (
    <div className="mt-4 min-w-0 overflow-hidden rounded-xl border border-border bg-background">
      <div className="border-b border-border bg-surface/50 px-3 py-2.5 sm:px-4">
        <p className="text-sm font-semibold text-foreground">{planWeekRangeLabel}</p>
        <p className="text-[11px] text-muted-foreground">
          Wochenplan · Karte antippen zum Bearbeiten · leeres Feld = Schicht mit Standardzeit
        </p>
      </div>

      <div className="overflow-x-auto scrollbar-hide">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[minmax(9.5rem,11rem)_repeat(7,minmax(5.5rem,1fr))] border-b border-border bg-muted/20">
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Mitarbeiter
            </div>
            {MON_FIRST_DOW.map((dow, colIdx) => {
              const staffed = staffedByDay[colIdx];
              const tone: StatusTone =
                staffed >= neededStaff ? "success" : staffed > 0 ? "warning" : "danger";
              const wx = weatherWeek[colIdx] ?? null;
              const hint = staffingHintByDay.get(dow);
              return (
                <div key={`hdr-${dow}`} className="border-l border-border/60 px-1.5 py-2 text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => onOpenTimelineDay?.(dow)}
                      className="rounded-md px-1 py-0.5 text-[11px] font-semibold text-foreground hover:bg-muted/60"
                      title="Tag in der Timeline öffnen"
                    >
                      {WEEK_SHORT_MON[colIdx]}
                    </button>
                    <span className="text-[9px] tabular-nums text-muted-foreground">
                      {formatShortDate(weekDayDates[colIdx] ?? "")}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                      {weatherIcon(wx, "h-3.5 w-3.5")}
                      {wx ? (
                        <span className="text-[9px] tabular-nums font-medium text-foreground/90">
                          {Math.round(wx.maxTempC)}°
                        </span>
                      ) : null}
                    </span>
                    <StatusBadge tone={tone} size="sm" glass withDot={false} className="mt-0.5 tabular-nums">
                      {staffed}/{neededStaff}
                    </StatusBadge>
                    {hint ? (
                      <StaffingHintBadge
                        tone={hint.tone}
                        label={hint.label}
                        tooltip={hint.tooltip}
                        className="mt-0.5 max-w-full scale-90"
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {members.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Noch keine Mitarbeitenden im Team.</p>
          ) : (
            members.map((member) => {
              const planned = memberMinutes.get(member.id) ?? 0;
              const targetH = member.weeklyHours ?? 0;
              const ratioLabel =
                targetH > 0 ? `${Math.round(planned / 60)}/${Math.round(targetH)}h` : `${Math.round(planned / 60)}h`;
              const initials = (member.name ?? member.email).slice(0, 2).toUpperCase();

              return (
                <div
                  key={member.id}
                  className="grid grid-cols-[minmax(9.5rem,11rem)_repeat(7,minmax(5.5rem,1fr))] border-b border-border/70 last:border-b-0"
                >
                  <div className="flex items-center gap-2 border-r border-border/60 px-2.5 py-2">
                    <Avatar
                      src={member.image}
                      fallback={initials}
                      alt={member.name ?? member.email}
                      className="h-8 w-8 shrink-0"
                      fallbackClassName="text-[9px]"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">{member.name ?? member.email}</p>
                      <p className="text-[10px] tabular-nums text-muted-foreground">{ratioLabel}</p>
                    </div>
                  </div>

                  {MON_FIRST_DOW.map((dow) => {
                    const key = `${member.id}-${selectedWeekIndex}-${dow}`;
                    const shift = shiftByUserAndDay.get(key);
                    const conflict = conflictTypeByCell.get(`${member.id}-${dow}`);

                    if (conflict) {
                      return (
                        <div
                          key={`cell-${member.id}-${dow}`}
                          className="flex min-h-[4.25rem] items-center justify-center border-l border-border/50 bg-muted/10 p-1"
                        >
                          <StatusBadge tone={conflict === "SICK" ? "danger" : "warning"} size="sm" glass withDot={false}>
                            {conflict === "SICK" ? "Krank" : "Urlaub"}
                          </StatusBadge>
                        </div>
                      );
                    }

                    if (shift) {
                      return (
                        <div key={`cell-${member.id}-${dow}`} className="border-l border-border/50 p-1">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => onEditShift(member.id, dow, shift, member.name ?? member.email)}
                            className={`flex min-h-[4.25rem] w-full flex-col items-start justify-center rounded-xl border px-2 py-2 text-left shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50 ${shiftSlotClass(shift.startTime)} ${
                              shift.isDraft ? "border-dashed ring-1 ring-brand/25" : ""
                            }`}
                          >
                            <span className="text-[10px] font-semibold leading-tight">
                              {shift.startTime.slice(0, 5)}–{shift.endTime.slice(0, 5)}
                            </span>
                            {shift.isDraft ? (
                              <span className="mt-0.5 text-[9px] font-medium opacity-80">Entwurf</span>
                            ) : null}
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div key={`cell-${member.id}-${dow}`} className="border-l border-border/50 p-1">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => onAddShift(member.id, dow)}
                          className="flex min-h-[4.25rem] w-full flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-border/80 bg-surface/40 text-muted-foreground transition-colors hover:border-brand/35 hover:bg-brand-soft/30 hover:text-brand disabled:opacity-50"
                        >
                          <Plus className="h-4 w-4" aria-hidden />
                          <span className="text-[9px] font-medium">Hinzufügen</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
