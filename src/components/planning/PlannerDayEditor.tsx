"use client";

import { useMemo } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Plus, X } from "lucide-react";
import {
  buildShiftSlotsByDay,
  type BoardMember,
  type BoardShiftRow,
  type BoardShiftSlot,
} from "@/lib/planning/shift-board-model";
import type { ShiftTemplateRow } from "@/lib/actions/shift-templates";
import { getWeekCycleIndex, type ShiftCycleWeeks } from "@/lib/shift-cycle";

const DAY_NAMES = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

type PlannerDayEditorProps = {
  selectedIso: string;
  shiftCycleWeeks: ShiftCycleWeeks;
  members: BoardMember[];
  shifts: BoardShiftRow[];
  shiftTemplates: ShiftTemplateRow[];
  neededStaff: number;
  isPending: boolean;
  onOpenAddSlot: () => void;
  onEditAssignment: (slot: BoardShiftSlot, userId: string, shiftId: string) => void;
  onRemoveAssignment: (
    userId: string,
    dayOfWeek: number,
    shiftId: string,
    startTime: string,
    endTime: string,
  ) => void;
};

function formatDayHeading(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "Tag wählen";
  const weekday = DAY_NAMES[d.getDay()] ?? "Tag";
  const date = d.toLocaleDateString("de-DE", { day: "numeric", month: "long" });
  return `${weekday}, ${date}`;
}

export function PlannerDayEditor({
  selectedIso,
  shiftCycleWeeks,
  members,
  shifts,
  shiftTemplates,
  neededStaff,
  isPending,
  onOpenAddSlot,
  onEditAssignment,
  onRemoveAssignment,
}: PlannerDayEditorProps) {
  const selectedDate = useMemo(() => new Date(`${selectedIso}T12:00:00`), [selectedIso]);
  const patternWeek = useMemo(
    () => getWeekCycleIndex(selectedDate, shiftCycleWeeks),
    [selectedDate, shiftCycleWeeks],
  );
  const dayOfWeek = selectedDate.getDay();

  const slots = useMemo(() => {
    const byDay = buildShiftSlotsByDay(shifts, patternWeek, members, shiftTemplates);
    return byDay.get(dayOfWeek) ?? [];
  }, [shifts, patternWeek, members, shiftTemplates, dayOfWeek]);

  const staffedTotal = slots.reduce((n, s) => n + s.assignments.length, 0);
  const gapSlots = slots.filter((s) => s.assignments.length < neededStaff).length;

  return (
    <div className="rounded-2xl border-2 border-border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{formatDayHeading(selectedIso)}</p>
          <p className="text-[11px] text-muted-foreground">
            {staffedTotal === 0
              ? "Noch keine Schicht — unten hinzufügen"
              : `${staffedTotal} Einsatz${staffedTotal === 1 ? "" : "e"}${gapSlots > 0 ? ` · ${gapSlots} Lücke${gapSlots === 1 ? "" : "n"}` : ""}`}
          </p>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={onOpenAddSlot}
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground shadow-sm hover:bg-brand/90 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Schicht
        </button>
      </div>

      <div className="divide-y divide-border">
        {slots.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            Für diesen Tag ist noch nichts geplant. „Schicht“ oben tippen — fertig.
          </p>
        ) : (
          slots.map((slot) => {
            const staffed = slot.assignments.length;
            const understaffed = staffed < neededStaff;
            return (
              <div key={slot.key} className="px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground">
                    {slot.title}{" "}
                    <span className="font-normal tabular-nums text-muted-foreground">{slot.rangeLabel}</span>
                  </p>
                  <span
                    className={`text-[10px] font-semibold tabular-nums ${
                      understaffed ? "text-warning-foreground" : "text-success-foreground"
                    }`}
                  >
                    {staffed}/{neededStaff}
                  </span>
                </div>
                {slot.assignments.length === 0 ? (
                  <p className="mt-1 text-[10px] text-muted-foreground">Offen — Person zuweisen im Wochen-Board oder hier Schicht anlegen.</p>
                ) : (
                  <ul className="mt-1.5 space-y-1">
                    {slot.assignments.map((a) => (
                      <li
                        key={a.shiftId}
                        className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/20 px-2 py-1"
                      >
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => onEditAssignment(slot, a.userId, a.shiftId)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <Avatar
                            src={a.image}
                            fallback={(a.name || a.email).slice(0, 2).toUpperCase()}
                            alt={a.name}
                            className="h-6 w-6 shrink-0"
                            fallbackClassName="text-[8px]"
                          />
                          <span className="truncate text-[11px] font-medium text-foreground">{a.name}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            onRemoveAssignment(a.userId, slot.dayOfWeek, a.shiftId, slot.startTime, slot.endTime)
                          }
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-danger-soft hover:text-danger"
                          aria-label={`${a.name} entfernen`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
