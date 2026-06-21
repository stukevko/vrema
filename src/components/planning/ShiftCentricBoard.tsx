"use client";

import { memo, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusTone } from "@/components/ui/StatusBadge";
import type { ShiftTemplateRow } from "@/lib/actions/shift-templates";
import type { MemberSaldoSnapshot } from "@/lib/planning/board-assistant";
import type { PlannerStaffingHint } from "@/lib/actions/predictive";
import type { DailyWeatherForecast } from "@/lib/weather/shared";
import {
  buildMemberWeekMinutes,
  buildShiftSlotsByDay,
  MON_FIRST_DOW,
  WEEK_SHORT_MON,
  type BoardMember,
  type BoardShiftRow,
  type BoardShiftSlot,
} from "@/lib/planning/shift-board-model";
import { formatSaldoHours } from "@/lib/planning/board-assistant";
import { shiftCardTone } from "@/lib/planning/shift-display";
import { Cloud, CloudRain, CloudSun, Flame, Loader2, Plus, Sun, X } from "lucide-react";

function presetButtonLabel(t: ShiftTemplateRow): string {
  const start = t.startTime.slice(0, 5);
  const end = t.endTime.slice(0, 5);
  return `${t.name} ${start}–${end}`;
}

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
  compact?: boolean;
  neededStaff: number;
  planWeekRangeLabel: string;
  weatherWeek: Array<DailyWeatherForecast | null>;
  weekDayDates: string[];
  staffingHintByDay: Map<number, PlannerStaffingHint>;
  shiftTemplates: ShiftTemplateRow[];
  activeTemplateId: string | null;
  selectedMemberId: string | null;
  memberSaldoById: Record<string, MemberSaldoSnapshot>;
  overtimeFilterOnly: boolean;
  isPending: boolean;
  busySlotKeys?: ReadonlySet<string>;
  gapFlashSlotKeys?: ReadonlySet<string>;
  onSelectTemplate: (template: ShiftTemplateRow) => void;
  onNeededStaffChange: (n: number) => void;
  onSelectMember: (userId: string) => void;
  onOpenAddSlot: (dayOfWeek: number) => void;
  onAssignMemberToSlot: (userId: string, slot: BoardShiftSlot) => void;
  onEditAssignment: (slot: BoardShiftSlot, userId: string, shiftId: string) => void;
  onRemoveAssignment: (
    userId: string,
    dayOfWeek: number,
    shiftId: string,
    startTime: string,
    endTime: string,
  ) => void;
  onClearSlot: (slot: BoardShiftSlot) => void;
  onOvertimeWarningClick: (userId: string, anchor: HTMLElement) => void;
};

const ShiftSlotCard = memo(function ShiftSlotCard({
  slot,
  neededStaff,
  isPending,
  dragOver,
  slotBusy,
  gapFlash,
  onDragOver,
  onDragLeave,
  onDrop,
  onEditAssignment,
  onRemoveAssignment,
  onClearSlot,
}: {
  slot: BoardShiftSlot;
  neededStaff: number;
  isPending: boolean;
  dragOver: boolean;
  slotBusy: boolean;
  gapFlash: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onEditAssignment: (slot: BoardShiftSlot, userId: string, shiftId: string) => void;
  onRemoveAssignment: (
    userId: string,
    dayOfWeek: number,
    shiftId: string,
    startTime: string,
    endTime: string,
  ) => void;
  onClearSlot: (slot: BoardShiftSlot) => void;
}) {
  const staffed = slot.assignments.length;
  const tone = coverageTone(staffed, neededStaff);
  const understaffed = staffed < neededStaff;

  return (
    <article
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative rounded-xl border p-2.5 shadow-sm transition-[border-color,box-shadow,background-color] ${shiftCardTone(slot.startTime, slot.suspicious)} ${
        dragOver ? "ring-2 ring-brand/50" : ""
      } ${understaffed && staffed === 0 ? "border-dashed" : ""} ${
        gapFlash ? "animate-pulse border-warning/55 bg-warning-soft/25 ring-1 ring-warning/30" : ""
      }`}
    >
      {slotBusy ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/55 backdrop-blur-[1px] dark:bg-black/35"
          aria-hidden
        >
          <Loader2 className="h-5 w-5 animate-spin text-brand" />
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold leading-tight">{slot.title}</p>
          <p className="text-[10px] font-medium tabular-nums opacity-90">{slot.rangeLabel}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge tone={tone} size="sm" glass withDot={false} className="tabular-nums">
            {staffed}/{neededStaff}
          </StatusBadge>
          {staffed > 0 ? (
            <button
              type="button"
              disabled={isPending || slotBusy}
              onClick={(e) => {
                e.stopPropagation();
                onClearSlot(slot);
              }}
              className="text-[9px] font-semibold text-muted-foreground underline-offset-2 hover:text-danger hover:underline disabled:opacity-40"
              title="Alle Zuweisungen für diese Schicht entfernen"
            >
              Schicht leeren
            </button>
          ) : null}
        </div>
      </div>
      {understaffed ? (
        <p className={`mt-1 text-[9px] font-medium ${gapFlash ? "text-warning-foreground" : "text-muted-foreground"}`}>
          {staffed === 0 ? "Offene Lücke" : `Offene Lücke (${staffed}/${neededStaff})`}
        </p>
      ) : null}

      <ul className="mt-2 space-y-1.5">
        {slot.assignments.map((a) => {
          const initials = (a.name || a.email).slice(0, 2).toUpperCase();
          return (
            <li key={a.shiftId} className="flex items-center gap-1.5 rounded-lg bg-background/55 px-1.5 py-1 dark:bg-black/15">
              <button
                type="button"
                disabled={isPending || slotBusy}
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
                  <span className="shrink-0 rounded bg-brand/15 px-1 py-0.5 text-[8px] font-bold uppercase text-brand">
                    Entwurf
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                disabled={isPending || slotBusy}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveAssignment(a.userId, slot.dayOfWeek, a.shiftId, slot.startTime, slot.endTime);
                }}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:border-danger/30 hover:bg-danger-soft hover:text-danger"
                aria-label={`${a.name} von Schicht entfernen`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
      </ul>
    </article>
  );
});

export function ShiftCentricBoard({
  members,
  shifts,
  selectedWeekIndex,
  compact = false,
  neededStaff,
  planWeekRangeLabel,
  weatherWeek,
  weekDayDates,
  staffingHintByDay,
  shiftTemplates,
  activeTemplateId,
  selectedMemberId,
  memberSaldoById,
  overtimeFilterOnly,
  isPending,
  busySlotKeys,
  gapFlashSlotKeys,
  onSelectTemplate,
  onNeededStaffChange,
  onSelectMember,
  onOpenAddSlot,
  onAssignMemberToSlot,
  onEditAssignment,
  onRemoveAssignment,
  onClearSlot,
  onOvertimeWarningClick,
}: ShiftCentricBoardProps) {
  const [dragOverSlotKey, setDragOverSlotKey] = useState<string | null>(null);
  const [draggingUserId, setDraggingUserId] = useState<string | null>(null);

  const slotsByDay = useMemo(
    () => buildShiftSlotsByDay(shifts, selectedWeekIndex, members, shiftTemplates),
    [shifts, selectedWeekIndex, members, shiftTemplates],
  );
  const memberMinutes = useMemo(
    () => buildMemberWeekMinutes(shifts, selectedWeekIndex, members.map((m) => m.id)),
    [shifts, selectedWeekIndex, members],
  );

  const visibleMembers = useMemo(() => {
    if (!overtimeFilterOnly) return members;
    return members.filter((m) => memberSaldoById[m.id]?.isCriticalOvertime);
  }, [members, overtimeFilterOnly, memberSaldoById]);

  const handleDropOnSlot = (e: React.DragEvent, slot: BoardShiftSlot) => {
    e.preventDefault();
    setDragOverSlotKey(null);
    const userId = e.dataTransfer.getData("text/vrema-member-id") || draggingUserId;
    if (!userId) return;
    if (slot.assignments.some((a) => a.userId === userId)) return;
    onAssignMemberToSlot(userId, slot);
    setDraggingUserId(null);
  };

  return (
    <div
      className={`surface-panel mt-2 flex flex-col lg:flex-row ${
        compact ? "min-h-0" : "min-h-[18rem] sm:min-h-[22rem] lg:min-h-[26rem]"
      }`}
    >
      <aside
        className={`shrink-0 border-b border-border bg-surface/60 max-lg:max-h-[28vh] lg:border-b-0 lg:border-r ${
          compact ? "lg:w-40" : "lg:w-52"
        } lg:max-h-none`}
      >
        <div className="border-b border-border px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Team</p>
          <p className="text-[11px] text-muted-foreground">
            {overtimeFilterOnly ? "Nur kritische Überstunden" : "Antippen oder in Schicht ziehen"}
          </p>
        </div>
        <ul className={`overflow-y-auto scrollbar-hide ${compact ? "max-h-[min(28vh,10rem)] lg:max-h-[20rem]" : "max-h-[min(36vh,14rem)] sm:max-h-48 lg:max-h-none lg:flex-1"}`}>
          {visibleMembers.length === 0 ? (
            <li className="px-3 py-6 text-center text-[11px] text-muted-foreground">
              {overtimeFilterOnly ? "Keine kritischen Überstunden in dieser Woche." : "Kein Team geladen."}
            </li>
          ) : (
            visibleMembers.map((member) => {
              const planned = memberMinutes.get(member.id) ?? 0;
              const target = member.weeklyHours ?? 0;
              const over = target > 0 && planned / 60 > target;
              const active = selectedMemberId === member.id;
              const initials = (member.name ?? member.email).slice(0, 2).toUpperCase();
              const saldo = memberSaldoById[member.id];
              const critical = saldo?.isCriticalOvertime ?? false;
              return (
                <li key={member.id}>
                  <div
                    className={`flex w-full items-center gap-1 px-2 py-1 transition-colors ${
                      active ? "bg-brand-soft ring-1 ring-inset ring-brand/35" : "hover:bg-muted/40"
                    } ${draggingUserId === member.id ? "opacity-60" : ""}`}
                  >
                    <button
                      type="button"
                      draggable
                      disabled={isPending}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/vrema-member-id", member.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDraggingUserId(member.id);
                      }}
                      onDragEnd={() => setDraggingUserId(null)}
                      onClick={() => onSelectMember(member.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
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
                          className={`text-[10px] tabular-nums ${
                            critical || over
                              ? "font-semibold text-warning-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {target > 0
                            ? `${Math.round(planned / 60)}/${Math.round(target)}h Plan`
                            : `${Math.round(planned / 60)}h Plan`}
                          {saldo && saldo.saldoMinutes !== 0 ? (
                            <span className="ml-1">· Saldo {formatSaldoHours(saldo.saldoMinutes)}</span>
                          ) : null}
                        </p>
                      </div>
                    </button>
                    {critical ? (
                      <button
                        type="button"
                        disabled={isPending}
                        title="Überstunden abbauen — Empfehlung anzeigen"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOvertimeWarningClick(member.id, e.currentTarget);
                        }}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-warning/40 bg-warning-soft text-warning-foreground hover:bg-warning/20"
                        aria-label="Überstunden-Hilfe"
                      >
                        <Flame className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border px-2.5 py-2">
          <div>
            <h3 className={`font-semibold text-foreground ${compact ? "text-sm" : "text-base"}`}>{planWeekRangeLabel}</h3>
            {!compact ? (
              <p className="text-[10px] text-muted-foreground">Schichten nach Tag · Drag aus Team-Spalte</p>
            ) : null}
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
            {shiftTemplates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTemplate(t)}
                title={presetButtonLabel(t)}
                className={`h-8 max-w-[10.5rem] truncate rounded-lg border px-2 text-[11px] font-medium transition-colors ${
                  activeTemplateId === t.id
                    ? "border-brand/40 bg-brand-soft text-brand"
                    : "border-border bg-background text-foreground hover:bg-muted/50"
                }`}
                style={
                  activeTemplateId === t.id && t.color
                    ? { borderColor: `${t.color}66`, backgroundColor: `${t.color}18` }
                    : undefined
                }
              >
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: t.color ?? "#94a3b8" }}
                    aria-hidden
                  />
                  {presetButtonLabel(t)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto p-2 scrollbar-hide">
          <div className={`flex min-w-max ${compact ? "gap-1.5" : "gap-2"}`}>
            {MON_FIRST_DOW.map((dow, colIdx) => {
              const slots = slotsByDay.get(dow) ?? [];
              const wx = weatherWeek[colIdx] ?? null;
              const hint = staffingHintByDay.get(dow);
              return (
                <div
                  key={`col-${dow}`}
                  className={`flex shrink-0 flex-col rounded-lg border border-border bg-muted/20 ${
                    compact ? "w-[8.75rem]" : "w-[10.5rem]"
                  }`}
                >
                  <header className="rounded-t-[0.65rem] border-b border-border bg-background px-2 py-1.5 text-center">
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
                          dragOver={dragOverSlotKey === slot.key}
                          slotBusy={busySlotKeys?.has(slot.key) ?? false}
                          gapFlash={gapFlashSlotKeys?.has(slot.key) ?? false}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverSlotKey(slot.key);
                          }}
                          onDragLeave={() => setDragOverSlotKey((k) => (k === slot.key ? null : k))}
                          onDrop={(e) => handleDropOnSlot(e, slot)}
                          onEditAssignment={onEditAssignment}
                          onRemoveAssignment={onRemoveAssignment}
                          onClearSlot={onClearSlot}
                        />
                      ))
                    )}
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => onOpenAddSlot(dow)}
                      title="Schicht anlegen"
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
