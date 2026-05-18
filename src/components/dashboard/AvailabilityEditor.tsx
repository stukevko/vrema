"use client";

import { useState, useTransition } from "react";
import { saveMyWorkSchedule, type WorkScheduleRow } from "@/lib/actions/work-schedule";
import { userErrorMessage } from "@/lib/errors/user-message";
import { toast } from "sonner";

const DAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function AvailabilityEditor({ initial }: { initial: WorkScheduleRow[] }) {
  const [rows, setRows] = useState(initial);
  const [pending, startTransition] = useTransition();

  const update = (dayOfWeek: number, patch: Partial<WorkScheduleRow>) => {
    setRows((prev) => prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...patch } : r)));
  };

  const save = () => {
    startTransition(async () => {
      try {
        await saveMyWorkSchedule(rows);
        toast.success("Verfügbarkeit gespeichert");
      } catch (e: unknown) {
        toast.error(userErrorMessage(e, "Speichern fehlgeschlagen."));
      }
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Markiere Tage, an denen du normalerweise <strong className="text-foreground">nicht</strong> arbeitest — der
        Planer warnt beim Einplanen.
      </p>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.dayOfWeek}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5"
          >
            <span className="w-8 text-sm font-bold text-foreground">{DAY_LABELS[row.dayOfWeek]}</span>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={row.isWorkDay}
                onChange={(e) => update(row.dayOfWeek, { isWorkDay: e.target.checked })}
                className="rounded border-border"
              />
              Kann arbeiten
            </label>
            {row.isWorkDay ? (
              <>
                <input
                  type="time"
                  value={row.startTime}
                  onChange={(e) => update(row.dayOfWeek, { startTime: e.target.value })}
                  className="input-field-subtle h-9 rounded-lg px-2 text-xs"
                />
                <span className="text-xs text-muted-foreground">–</span>
                <input
                  type="time"
                  value={row.endTime}
                  onChange={(e) => update(row.dayOfWeek, { endTime: e.target.value })}
                  className="input-field-subtle h-9 rounded-lg px-2 text-xs"
                />
              </>
            ) : (
              <span className="text-xs font-medium text-amber-800 dark:text-amber-200">Nicht verfügbar</span>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={pending}
        onClick={save}
        className="btn-primary-solid min-h-11 rounded-2xl px-5 text-sm font-semibold disabled:opacity-60"
      >
        {pending ? "Speichern…" : "Speichern"}
      </button>
    </div>
  );
}
