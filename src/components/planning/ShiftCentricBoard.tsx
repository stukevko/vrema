"use client";

import { useMemo } from "react";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusTone } from "@/components/ui/StatusBadge";
import type { PlannerStaffingHint } from "@/lib/actions/predictive";
import type { DailyWeatherForecast } from "@/lib/weather/shared";
import {
  buildMemberWeekMinutes,
  buildShiftSlotsByDay,
  MON_FIRST_DOW,
  SHIFT_PRESETS,
  WEEK_SHORT_MON,
  type BoardMember,
  type BoardShiftRow,
  type BoardShiftSlot,
} from "@/lib/planning/shift-board-model";
import { shiftCardTone } from "@/lib/planning/shift-display";
import { Cloud, CloudRain, CloudSun, Plus, Sun, UserPlus, X } from "lucide-react";

function weatherIcon(day: DailyWeatherForecast | null, className: string) {
  if (!day) return null;
  if (day.condition === "RAIN" || day.condition === "SNOW") return <CloudRain className={className} aria-hidden />;
  if (day.condition === "CLEAR") return <Sun className={className} aria-hidden />;
  if (day.condition === "CLOUDS") return <Cloud className={className} aria-hidden />;
  return <CloudSun className={className} aria-hidden />;
}

function formatShortDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

function coverageTone(staffed: number, needed: number): StatusTone {
  if (staffed >= needed) return "success";
  if (staffed > 0) return "warning";
  return "danger";
}

export type ShiftCentricBoardProps = {
  members: BoardMember[];
  shifts: BoardShiftRow[];
  selectedWeekIndex: number;
  neededStaff: number;
  planWeekRangeLabel: string;
  weatherWeek: Array<DailyWeatherForecast | null>;
  weekDayDates: string[];
  staffingHintByDay: Map<number, PlannerStaffingHint>;
  activePreset: keyof typeof SHIFT_PRESETS;
  selectedMemberId: string | null;
  isPending: boolean;
  onPresetChange: (preset: keyof typeof SHIFT_PRESETS) => void;
  onNeededStaffChange: (n: number) => void;
  onSelectMember: (userId: string) => void;
  onCreateSlot: (dayOfWeek: number) => void;
  onAssignToSlot: (slot: BoardShiftSlot) => void;
  onEditAssignment: (slot: BoardShiftSlot, userId: string, shiftId: string) => void;
  onRemoveAssignment: (userId: string, dayOfWeek: number, shiftId: string) => void;
};

function ShiftSlotCard({
  slot,
  neededStaff,
  isPending,
  selectedMemberId,
  onAssignToSlot,
  onEditAssignment,
  onRemoveAssignment,
}: {
  slot: BoardShiftSlot;
  neededStaff: number;
  isPending: boolean;
  selectedMemberId: string | null;
  onAssignToSlot: (slot: BoardShiftSlot) => void;
  onEditAssignment: (slot: BoardShiftSlot, userId: string, shiftId: string) => void;
  onRemoveAssignment: (userId: string, dayOfWeek: number, shiftId: string) => void;
}) {
  const staffed = slot.assignments.length;
  const tone = coverageTone(staffed, neededStaff);
  const canAdd =
    selectedMemberId &&
    !slot.assignments.some((a) => a.userId === selectedMemberId) &&
    !slot.suspicious;

  return (
    <article
      className={`rounded-xl border p-2.5 shadow-sm ${shiftCardTone(slot.startTime, slot.suspicious)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold leading-tight">{slot.title}</p>
          <p className="text-[10px] font-medium tabular-nums opacity-90">{slot.rangeLabel}</p>
        </div>
        <StatusBadge tone={tone} size="sm" glass withDot={false} className="shrink-0 tabular-nums">
          {staffed}/{neededStaff}
        </StatusBadge>
      </div>

      <ul className="mt-2 space-y-1.5">
        {slot.assignments.map((a) => {
          const initials = (a.name || a.email).slice(0, 2).toUpperCase();
          return (
            <li key={a.shiftId} className="flex items-center gap-1.5 rounded-lg bg-background/55 px-1.5 py-1 dark:bg-black/15">
              <button
                type="button"
                disabled={isPending}
                onClick={() => onEditAssignment(slot, a.userId, a.shiftId)}
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
              >
                <Avatar
                  src={a.image}
                  fallback={initials}
                  alt={a.name}
                  className="h-6 w-6 shrink-0"
                  fallbackClassName="text-[8px]"
                />
                <span className="truncate text-[11px] font-medium">{a.name}</span>
                {a.isDraft ? (
                  <span className="text-[9px] font-semibold uppercase text-brand">Entwurf</span>
                ) : null}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => onRemoveAssignment(a.userId, slot.dayOfWeek, a.shiftId)}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-danger-soft hover:text-danger"
                aria-label={`${a.name} von Schicht entfernen`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
      </ul>

      {canAdd ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => onAssignToSlot(slot)}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-current/30 py-1.5 text-[10px] font-semibold opacity-90 hover:bg-background/40"
        >
          <UserPlus className="h-3.5 w-3.5" aria-hidden />
          Auswahl zuweisen
        </button>
      ) : null}
    </article>
  );
}

export function ShiftCentricBoard({
  members,
  shifts,
  selectedWeekIndex,
  neededStaff,
  planWeekRangeLabel,
  weatherWeek,
  weekDayDates,
  staffingHintByDay,
  activePreset,
  selectedMemberId,
  isPending,
  onPresetChange,
  onNeededStaffChange,
  onSelectMember,
  onCreateSlot,
  onAssignToSlot,
  onEditAssignment,
  onRemoveAssignment,
}: ShiftCentricBoardProps) {
  const slotsByDay = useMemo(
    () => buildShiftSlotsByDay(shifts, selectedWeekIndex, members),
    [shifts, selectedWeekIndex, members],
  );
  const memberMinutes = useMemo(
    () => buildMemberWeekMinutes(shifts, selectedWeekIndex, members.map((m) => m.id)),
    [shifts, selectedWeekIndex, members],
  );

  return (
    <div className="mt-3 flex min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm lg:min-h-[32rem] lg:flex-row">
      {/* Mitarbeiter-Deck */}
      <aside className="shrink-0 border-b border-border bg-surface/50 lg:w-52 lg:border-b-0 lg:border-r">
        <div className="border-b border-border/60 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Team</p>
          <p className="text-[11px] text-muted-foreground">Zum Zuweisen antippen</p>
        </div>
        <ul className="max-h-48 overflow-y-auto scrollbar-hide lg:max-h-none lg:flex-1">
          {members.map((member) => {
            const planned = memberMinutes.get(member.id) ?? 0;
            const target = member.weeklyHours ?? 0;
            const over = target > 0 && planned / 60 > target;
            const active = selectedMemberId === member.id;
            const initials = (member.name ?? member.email).slice(0, 2).toUpperCase();
            return (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => onSelectMember(member.id)}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                    active ? "bg-brand-soft ring-1 ring-inset ring-brand/35" : "hover:bg-muted/40"
                  }`}
                >
                  <Avatar
                    src={member.image}
                    fallback={initials}
                    alt={member.name ?? member.email}
                    className="h-8 w-8 shrink-0"
                    fallbackClassName="text-[9px]"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">{member.name ?? member.email}</p>
                    <p
                      className={`text-[10px] tabular-nums ${over ? "font-semibold text-warning-foreground" : "text-muted-foreground"}`}
                    >
                      {target > 0 ? `${Math.round(planned / 60)}/${Math.round(target)}h` : `${Math.round(planned / 60)}h`}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Kanban-Board */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-3 py-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">{planWeekRangeLabel}</h3>
            <p className="text-[11px] text-muted-foreground">Schichten nach Tag · Deckung pro Schichtkarte</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-16">
              <label className="mb-1 block text-[9px] font-semibold uppercase text-muted-foreground">Min.</label>
              <input
                type="number"
                min={1}
                max={20}
                value={neededStaff}
                onChange={(e) => onNeededStaffChange(Math.max(1, Number(e.target.value) || 1))}
                className="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs tabular-nums"
              />
            </div>
            {(Object.keys(SHIFT_PRESETS) as Array<keyof typeof SHIFT_PRESETS>).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onPresetChange(key)}
                className={`h-8 rounded-lg border px-2 text-[11px] font-medium ${
                  activePreset === key
                    ? "border-brand/40 bg-brand-soft text-brand"
                    : "border-border bg-background text-foreground hover:bg-muted/50"
                }`}
              >
                {SHIFT_PRESETS[key].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto p-3 scrollbar-hide">
          <div className="flex min-w-max gap-3">
            {MON_FIRST_DOW.map((dow, colIdx) => {
              const slots = slotsByDay.get(dow) ?? [];
              const wx = weatherWeek[colIdx] ?? null;
              const hint = staffingHintByDay.get(dow);
              return (
                <div
                  key={`col-${dow}`}
                  className="flex w-[11.5rem] shrink-0 flex-col rounded-xl border border-border/80 bg-muted/15"
                >
                  <header className="rounded-t-xl border-b border-border/60 bg-background/80 px-2.5 py-2 text-center">
                    <p className="text-xs font-bold text-foreground">{WEEK_SHORT_MON[colIdx]}</p>
                    <p className="text-[10px] tabular-nums text-muted-foreground">{formatShortDate(weekDayDates[colIdx] ?? "")}</p>
                    <div className="mt-1 flex items-center justify-center gap-1 text-muted-foreground">
                      {weatherIcon(wx, "h-3.5 w-3.5")}
                      {wx ? <span className="text-[10px] font-medium tabular-nums">{Math.round(wx.maxTempC)}°</span> : null}
                    </div>
                    {hint && hint.tone === "urgent" ? (
                      <p className="mt-0.5 truncate text-[8px] font-bold uppercase text-warning-foreground">{hint.label}</p>
                    ) : null}
                  </header>

                  <div className="flex flex-1 flex-col gap-2 p-2">
                    {slots.length === 0 ? (
                      <p className="py-6 text-center text-[10px] text-muted-foreground">Noch keine Schicht</p>
                    ) : (
                      slots.map((slot) => (
                        <ShiftSlotCard
                          key={slot.key}
                          slot={slot}
                          neededStaff={neededStaff}
                          isPending={isPending}
                          selectedMemberId={selectedMemberId}
                          onAssignToSlot={onAssignToSlot}
                          onEditAssignment={onEditAssignment}
                          onRemoveAssignment={onRemoveAssignment}
                        />
                      ))
                    )}
                    <button
                      type="button"
                      disabled={isPending || !selectedMemberId}
                      onClick={() => onCreateSlot(dow)}
                      title={selectedMemberId ? "Neue Schicht für ausgewählte Person" : "Zuerst Person links wählen"}
                      className="mt-auto flex items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-[10px] font-semibold text-muted-foreground transition hover:border-brand/40 hover:bg-brand-soft/20 hover:text-brand disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      Schicht
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
