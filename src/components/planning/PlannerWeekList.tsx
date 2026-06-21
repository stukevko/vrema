"use client";

import { Avatar } from "@/components/ui/avatar";
import type { ShiftTemplateRow } from "@/lib/actions/shift-templates";
import {
  buildShiftSlotsByDay,
  MON_FIRST_DOW,
  type BoardMember,
  type BoardShiftRow,
  type BoardShiftSlot,
} from "@/lib/planning/shift-board-model";
import { PlannerDayEditor } from "@/components/planning/PlannerDayEditor";
import type { ShiftCycleWeeks } from "@/lib/shift-cycle";

type PlannerWeekListProps = {
  weekDayDates: string[];
  shiftCycleWeeks: ShiftCycleWeeks;
  selectedWeekIndex: ShiftCycleWeeks;
  members: BoardMember[];
  shifts: BoardShiftRow[];
  shiftTemplates: ShiftTemplateRow[];
  neededStaff: number;
  selectedUserId: string;
  isPending: boolean;
  onSelectMember: (userId: string) => void;
  onOpenAddForDay: (dayOfWeek: number) => void;
  onEditAssignment: (slot: BoardShiftSlot, userId: string, shiftId: string) => void;
  onRemoveAssignment: (
    userId: string,
    dayOfWeek: number,
    shiftId: string,
    startTime: string,
    endTime: string,
  ) => void;
};

export function PlannerWeekList({
  weekDayDates,
  shiftCycleWeeks,
  selectedWeekIndex,
  members,
  shifts,
  shiftTemplates,
  neededStaff,
  selectedUserId,
  isPending,
  onSelectMember,
  onOpenAddForDay,
  onEditAssignment,
  onRemoveAssignment,
}: PlannerWeekListProps) {
  const slotsByDay = buildShiftSlotsByDay(shifts, selectedWeekIndex, members, shiftTemplates);
  const staffedDays = MON_FIRST_DOW.filter((dow) => (slotsByDay.get(dow)?.length ?? 0) > 0).length;

  return (
    <div className="space-y-3">
      <div className="surface-panel rounded-xl px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Wer planen?</p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {members.map((member) => {
            const active = selectedUserId === member.id;
            const label = (member.name ?? member.email).trim();
            return (
              <button
                key={member.id}
                type="button"
                disabled={isPending}
                onClick={() => onSelectMember(member.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-left text-xs font-medium transition ${
                  active
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-border bg-background text-foreground hover:bg-muted/40"
                }`}
              >
                <Avatar
                  src={member.image}
                  fallback={label.slice(0, 2).toUpperCase()}
                  alt={label}
                  className="h-6 w-6 shrink-0"
                  fallbackClassName="text-[8px]"
                />
                <span className="max-w-[8rem] truncate">{label}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {selectedUserId
            ? "Person gewählt → unten beim Tag „+ Schicht“ tippen."
            : "Zuerst eine Person wählen."}
          {staffedDays > 0 ? ` · ${staffedDays} Tag${staffedDays === 1 ? "" : "e"} mit Schichten` : ""}
        </p>
      </div>

      <div className="space-y-2">
        {MON_FIRST_DOW.map((dow, colIdx) => (
          <PlannerDayEditor
            key={weekDayDates[colIdx] ?? dow}
            selectedIso={weekDayDates[colIdx] ?? ""}
            shiftCycleWeeks={shiftCycleWeeks}
            members={members}
            shifts={shifts}
            shiftTemplates={shiftTemplates}
            neededStaff={neededStaff}
            isPending={isPending}
            onOpenAddSlot={() => onOpenAddForDay(dow)}
            onEditAssignment={onEditAssignment}
            onRemoveAssignment={onRemoveAssignment}
          />
        ))}
      </div>
    </div>
  );
}
