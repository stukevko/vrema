"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/avatar";
import { PlannerModalPortal } from "@/components/planning/PlannerModalPortal";

const DAY_NAMES = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"] as const;

export type ShiftAddSheetMember = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
};

export type ShiftAddSheetExisting = {
  label: string;
  timeRange: string;
};

type Props = {
  open: boolean;
  dateIso?: string | null;
  dayOfWeek: number | null;
  members: ShiftAddSheetMember[];
  existingShifts?: ShiftAddSheetExisting[];
  selectedUserId: string;
  defaultStart?: string;
  defaultEnd?: string;
  isPending: boolean;
  onSelectMember: (userId: string) => void;
  onClose: () => void;
  onConfirm: (dayOfWeek: number, userId: string, startTime: string, endTime: string) => void;
  onConfirmAndAddAnother?: (
    dayOfWeek: number,
    userId: string,
    startTime: string,
    endTime: string,
  ) => void;
};

function formatDateHeading(dateIso: string | null | undefined, dayOfWeek: number | null): string {
  if (dateIso) {
    const d = new Date(`${dateIso}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      const weekday = DAY_NAMES[d.getDay()] ?? "Tag";
      const date = d.toLocaleDateString("de-DE", { day: "numeric", month: "long" });
      return `${weekday}, ${date}`;
    }
  }
  if (dayOfWeek != null) return DAY_NAMES[dayOfWeek] ?? "Tag";
  return "Tag wählen";
}

export function ShiftAddSheet({
  open,
  dateIso,
  dayOfWeek,
  members,
  existingShifts = [],
  selectedUserId,
  defaultStart = "09:00",
  defaultEnd = "17:00",
  isPending,
  onSelectMember,
  onClose,
  onConfirm,
  onConfirmAndAddAnother,
}: Props) {
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);

  useEffect(() => {
    if (!open) return;
    setStartTime(defaultStart);
    setEndTime(defaultEnd);
  }, [open, defaultStart, defaultEnd]);

  const heading = useMemo(() => formatDateHeading(dateIso, dayOfWeek), [dateIso, dayOfWeek]);
  const invalidRange = startTime === endTime || !startTime || !endTime;
  const canSave = Boolean(selectedUserId && dayOfWeek != null && !invalidRange && !isPending);

  if (!open) return null;

  return (
    <PlannerModalPortal open={open}>
      <div
        className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shift-add-title"
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/30 backdrop-blur-[8px]"
          aria-label="Schließen"
          onClick={onClose}
        />
        <div className="relative flex max-h-[min(520px,calc(100dvh-2rem))] w-full max-w-[360px] flex-col overflow-hidden rounded-[1.35rem] border border-border/60 bg-card shadow-[0_24px_80px_-12px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Schicht eintragen
            </p>
            <h2 id="shift-add-title" className="mt-1 text-lg font-semibold tracking-tight text-foreground">
              {heading}
            </h2>
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

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-2">
          {existingShifts.length > 0 ? (
            <div className="rounded-xl border border-border/60 bg-muted/15 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Bereits am Tag
              </p>
              <ul className="mt-1 space-y-0.5">
                {existingShifts.map((row) => (
                  <li key={`${row.label}-${row.timeRange}`} className="text-xs text-foreground">
                    {row.label} · {row.timeRange}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Wer arbeitet?</p>
            <div className="space-y-1.5">
              {members.map((member) => {
                const label = (member.name ?? member.email).trim();
                const active = member.id === selectedUserId;
                return (
                  <button
                    key={member.id}
                    type="button"
                    disabled={isPending}
                    onClick={() => onSelectMember(member.id)}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                      active
                        ? "bg-brand-soft ring-1 ring-brand/40"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <Avatar
                      src={member.image}
                      fallback={label.slice(0, 2).toUpperCase()}
                      alt={label}
                      className="h-8 w-8 shrink-0"
                      fallbackClassName="text-[10px]"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{label}</span>
                    {active ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand text-brand-foreground">
                        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                      </span>
                    ) : (
                      <span className="h-5 w-5 shrink-0 rounded-full border border-border/80" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Wann?</p>
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/20">
              <div className="grid grid-cols-2 divide-x divide-border/60">
                <label className="flex flex-col px-4 py-3">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Von</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    disabled={isPending}
                    className="mt-1 w-full border-0 bg-transparent p-0 text-xl font-semibold tabular-nums text-foreground outline-none"
                  />
                </label>
                <label className="flex flex-col px-4 py-3">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Bis</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
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
        </div>

        <div className="shrink-0 space-y-2 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
          <Button
            type="button"
            variant="brand"
            size="md"
            className="min-h-11 w-full rounded-xl"
            disabled={!canSave}
            onClick={() => {
              if (dayOfWeek == null || !selectedUserId) return;
              onConfirm(dayOfWeek, selectedUserId, startTime, endTime);
            }}
          >
            Speichern
          </Button>
          {onConfirmAndAddAnother ? (
            <Button
              type="button"
              variant="outline"
              size="md"
              className="min-h-11 w-full rounded-xl"
              disabled={!canSave}
              onClick={() => {
                if (dayOfWeek == null || !selectedUserId) return;
                onConfirmAndAddAnother(dayOfWeek, selectedUserId, startTime, endTime);
              }}
            >
              Speichern & nächste Person
            </Button>
          ) : null}
        </div>
        </div>
      </div>
    </PlannerModalPortal>
  );
}
