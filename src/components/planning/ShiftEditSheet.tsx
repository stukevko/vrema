"use client";

import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

const DAY_NAMES = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

type Props = {
  open: boolean;
  dayOfWeek: number;
  memberLabel: string;
  startTime: string;
  endTime: string;
  slotLabel?: string;
  isPending: boolean;
  onClose: () => void;
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
};

export function ShiftEditSheet({
  open,
  dayOfWeek,
  memberLabel,
  startTime,
  endTime,
  slotLabel = "Schicht",
  isPending,
  onClose,
  onChangeStart,
  onChangeEnd,
  onSave,
  onDelete,
}: Props) {
  if (!open) return null;

  const dayShort = DAY_NAMES[dayOfWeek] ?? "Tag";
  const invalidRange = !startTime || !endTime || startTime === endTime;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shift-edit-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/25 backdrop-blur-[6px]"
        aria-label="Schließen"
        onClick={onClose}
      />
      <div className="relative flex w-full max-w-[340px] flex-col overflow-hidden rounded-t-[1.35rem] border border-border/60 bg-card/95 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:rounded-[1.35rem]">
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {slotLabel} bearbeiten
            </p>
            <h2 id="shift-edit-title" className="mt-1 truncate text-lg font-semibold tracking-tight text-foreground">
              {memberLabel}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{dayShort}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition hover:bg-muted"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-3">
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/20">
            <div className="grid grid-cols-2 divide-x divide-border/60">
              <label className="flex flex-col px-4 py-3">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Von</span>
                <input
                  type="time"
                  step={900}
                  value={startTime.slice(0, 5)}
                  onChange={(e) => onChangeStart(e.target.value)}
                  disabled={isPending}
                  className="mt-1 w-full border-0 bg-transparent p-0 text-xl font-semibold tabular-nums text-foreground outline-none"
                />
              </label>
              <label className="flex flex-col px-4 py-3">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Bis</span>
                <input
                  type="time"
                  step={900}
                  value={endTime.slice(0, 5)}
                  onChange={(e) => onChangeEnd(e.target.value)}
                  disabled={isPending}
                  className="mt-1 w-full border-0 bg-transparent p-0 text-xl font-semibold tabular-nums text-foreground outline-none"
                />
              </label>
            </div>
          </div>
          {invalidRange ? (
            <p className="mt-2 text-center text-xs text-warning-foreground">Start und Ende müssen unterschiedlich sein.</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">
          <Button
            type="button"
            variant="brand"
            size="md"
            className="min-h-11 w-full rounded-xl"
            disabled={isPending || invalidRange}
            onClick={onSave}
          >
            Speichern
          </Button>
          <button
            type="button"
            disabled={isPending}
            onClick={onDelete}
            className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-medium text-danger-foreground transition hover:bg-danger-soft/80 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}
