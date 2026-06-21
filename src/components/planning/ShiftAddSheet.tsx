"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/avatar";

const DAY_NAMES = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"] as const;

export type ShiftAddSheetMember = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
};

type Props = {
  open: boolean;
  dateIso?: string | null;
  dayOfWeek: number | null;
  members: ShiftAddSheetMember[];
  selectedUserId: string;
  defaultStart?: string;
  defaultEnd?: string;
  isPending: boolean;
  onSelectMember: (userId: string) => void;
  onClose: () => void;
  onConfirm: (dayOfWeek: number, userId: string, startTime: string, endTime: string) => void;
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
  selectedUserId,
  defaultStart = "09:00",
  defaultEnd = "17:00",
  isPending,
  onSelectMember,
  onClose,
  onConfirm,
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
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shift-add-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Schließen"
        onClick={onClose}
      />
      <div className="relative flex max-h-[min(520px,92dvh)] w-full max-w-sm flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 id="shift-add-title" className="text-base font-semibold text-foreground">
              Schicht eintragen
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{heading}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/40"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Person</p>
            <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
              {members.map((member) => {
                const label = (member.name ?? member.email).trim();
                const active = member.id === selectedUserId;
                return (
                  <button
                    key={member.id}
                    type="button"
                    disabled={isPending}
                    onClick={() => onSelectMember(member.id)}
                    className={`flex min-h-10 w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${
                      active
                        ? "border-brand bg-brand-soft text-brand"
                        : "border-border bg-background text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <Avatar
                      src={member.image}
                      fallback={label.slice(0, 2).toUpperCase()}
                      alt={label}
                      className="h-7 w-7 shrink-0"
                      fallbackClassName="text-[9px]"
                    />
                    <span className="truncate text-sm font-medium">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Uhrzeit</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Von</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold tabular-nums"
                  disabled={isPending}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Bis</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold tabular-nums"
                  disabled={isPending}
                />
              </label>
            </div>
            {invalidRange ? (
              <p className="mt-1.5 text-xs text-warning-foreground">Start und Ende müssen unterschiedlich sein.</p>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="brand"
            size="md"
            className="w-full min-h-11"
            disabled={!canSave}
            onClick={() => {
              if (dayOfWeek == null || !selectedUserId) return;
              onConfirm(dayOfWeek, selectedUserId, startTime, endTime);
            }}
          >
            <Clock className="mr-1.5 h-4 w-4" aria-hidden />
            Speichern
          </Button>
        </div>
      </div>
    </div>
  );
}
