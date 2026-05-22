"use client";

import { useEffect, useState } from "react";
import { Drawer } from "vaul";
import type { ShiftTemplateRow } from "@/lib/actions/shift-templates";
import { Clock, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

const WEEK_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

function formatPresetLabel(t: ShiftTemplateRow): string {
  return `${t.name} ${t.startTime.slice(0, 5)}–${t.endTime.slice(0, 5)}`;
}

type Props = {
  open: boolean;
  dayOfWeek: number | null;
  memberLabel: string | null;
  templates: ShiftTemplateRow[];
  isPending: boolean;
  onClose: () => void;
  onConfirm: (dayOfWeek: number, startTime: string, endTime: string) => void;
};

export function ShiftAddSheet({
  open,
  dayOfWeek,
  memberLabel,
  templates,
  isPending,
  onClose,
  onConfirm,
}: Props) {
  const [customMode, setCustomMode] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  useEffect(() => {
    if (!open) {
      setCustomMode(false);
      return;
    }
    const first = templates[0];
    if (first) {
      setStartTime(first.startTime.slice(0, 5));
      setEndTime(first.endTime.slice(0, 5));
    }
  }, [open, templates]);

  const dayLabel = dayOfWeek != null ? WEEK_LABELS[dayOfWeek] : "—";

  return (
    <Drawer.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[90] bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[100] mx-auto flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-card outline-none">
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted" aria-hidden />
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <Drawer.Title className="text-base font-semibold text-foreground">Schicht anlegen</Drawer.Title>
              <Drawer.Description className="mt-0.5 text-xs text-muted-foreground">
                {dayLabel}
                {memberLabel ? ` · ${memberLabel}` : ""}
                {" — Vorlage wählen oder individuelle Zeiten eingeben."}
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

          <div className="overflow-y-auto px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {templates.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Vorlage wählen</p>
                <div className="flex flex-col gap-2">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      disabled={isPending || dayOfWeek == null}
                      onClick={() => {
                        if (dayOfWeek == null) return;
                        onConfirm(dayOfWeek, t.startTime, t.endTime);
                        onClose();
                      }}
                      className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-3 text-left text-sm font-medium transition hover:border-brand/40 hover:bg-brand-soft/30 disabled:opacity-50"
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: t.color ?? "#94a3b8" }}
                        aria-hidden
                      />
                      {formatPresetLabel(t)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Noch keine Vorlagen — unter Einstellungen anlegen oder individuelle Zeiten nutzen.
              </p>
            )}

            <div className="mt-4 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setCustomMode((v) => !v)}
                className="text-sm font-semibold text-brand underline-offset-2 hover:underline"
              >
                {customMode ? "Individuelle Zeiten ausblenden" : "Individuelle Zeiten (einmalig)"}
              </button>

              {customMode ? (
                <div className="mt-3 space-y-3 rounded-xl border border-border bg-surface/40 p-3">
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted-foreground">Start</span>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums"
                      disabled={isPending}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted-foreground">Ende</span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums"
                      disabled={isPending}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="brand"
                    size="md"
                    className="w-full"
                    disabled={isPending || dayOfWeek == null}
                    onClick={() => {
                      if (dayOfWeek == null) return;
                      onConfirm(dayOfWeek, startTime, endTime);
                      onClose();
                    }}
                  >
                    <Clock className="mr-1.5 h-4 w-4" aria-hidden />
                    Mit diesen Zeiten speichern
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
