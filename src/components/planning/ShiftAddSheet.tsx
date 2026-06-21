"use client";

import { useEffect, useState } from "react";
import { Drawer } from "vaul";
import { Clock, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/avatar";

const WEEK_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

export type ShiftAddSheetMember = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
};

type Props = {
  open: boolean;
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

export function ShiftAddSheet({
  open,
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

  const dayLabel = dayOfWeek != null ? WEEK_LABELS[dayOfWeek] : "—";
  const invalidRange = startTime === endTime || !startTime || !endTime;
  const canSave = Boolean(selectedUserId && dayOfWeek != null && !invalidRange && !isPending);

  return (
    <Drawer.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[90] bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[100] mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-card outline-none md:inset-x-auto md:left-1/2 md:top-1/2 md:max-h-[min(640px,90vh)] md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl">
          <Drawer.Handle className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted md:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <Drawer.Title className="text-base font-semibold text-foreground">Schicht eintragen</Drawer.Title>
              <Drawer.Description className="mt-0.5 text-xs text-muted-foreground">
                {dayLabel} — Person wählen, Uhrzeit eintragen, speichern.
              </Drawer.Description>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground"
              aria-label="Schließen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">1. Person</p>
                <div className="mt-2 flex flex-col gap-2">
                  {members.map((member) => {
                    const label = (member.name ?? member.email).trim();
                    const active = member.id === selectedUserId;
                    return (
                      <button
                        key={member.id}
                        type="button"
                        disabled={isPending}
                        onClick={() => onSelectMember(member.id)}
                        className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                          active
                            ? "border-brand bg-brand-soft text-brand"
                            : "border-border bg-background text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <Avatar
                          src={member.image}
                          fallback={label.slice(0, 2).toUpperCase()}
                          alt={label}
                          className="h-8 w-8 shrink-0"
                          fallbackClassName="text-[10px]"
                        />
                        <span className="truncate text-sm font-semibold">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">2. Uhrzeit</p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted-foreground">Von</span>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-base font-semibold tabular-nums"
                      disabled={isPending}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted-foreground">Bis</span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-base font-semibold tabular-nums"
                      disabled={isPending}
                    />
                  </label>
                </div>
                {invalidRange ? (
                  <p className="mt-2 text-xs font-medium text-warning-foreground">Start und Ende müssen unterschiedlich sein.</p>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button
                type="button"
                variant="brand"
                size="md"
                className="w-full min-h-12"
                disabled={!canSave}
                onClick={() => {
                  if (dayOfWeek == null || !selectedUserId) return;
                  onConfirm(dayOfWeek, selectedUserId, startTime, endTime);
                  onClose();
                }}
              >
                <Clock className="mr-1.5 h-4 w-4" aria-hidden />
                Schicht speichern
              </Button>
              {!selectedUserId ? (
                <p className="mt-2 text-center text-[11px] text-muted-foreground">Bitte zuerst eine Person wählen.</p>
              ) : null}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
