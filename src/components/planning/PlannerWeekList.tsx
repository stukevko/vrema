"use client";

import type { ShiftTemplateRow } from "@/lib/actions/shift-templates";
import {
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
  isPending: boolean;
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
  isPending,
  onOpenAddForDay,
  onEditAssignment,
  onRemoveAssignment,
}: PlannerWeekListProps) {
  return (
    <div className="space-y-2">
      <p className="rounded-xl border border-border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground">So geht&apos;s:</span> Beim Tag „+ Schicht“ tippen → Person
        wählen → Von/Bis eintragen → Speichern.
      </p>

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
