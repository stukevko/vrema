"use client";

import { useState, useTransition } from "react";
import {
  createShiftTemplate,
  deleteShiftTemplate,
  type ShiftTemplateRow,
} from "@/lib/actions/shift-templates";
import { userErrorMessage } from "@/lib/errors/user-message";
import { Clock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Props = {
  initialTemplates: ShiftTemplateRow[];
};

export function ShiftTemplatesSection({ initialTemplates }: Props) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [color, setColor] = useState("#f59e0b");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setMessage(null);
    startTransition(async () => {
      try {
        const created = await createShiftTemplate({ name, startTime, endTime, color });
        setTemplates((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
        setName("");
        setMessage("Vorlage gespeichert.");
      } catch (e: unknown) {
        setMessage(userErrorMessage(e, "Speichern fehlgeschlagen."));
      }
    });
  };

  const remove = (id: string) => {
    if (!window.confirm("Schicht-Vorlage wirklich löschen?")) return;
    setMessage(null);
    startTransition(async () => {
      try {
        await deleteShiftTemplate(id);
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        setMessage("Vorlage gelöscht.");
      } catch (e: unknown) {
        setMessage(userErrorMessage(e, "Löschen fehlgeschlagen."));
      }
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Definiere typische Schichten für deinen Betrieb — sie erscheinen als Schnellauswahl im Schichtplan.
      </p>

      {templates.length > 0 ? (
        <ul className="space-y-2">
          {templates.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: t.color ?? "#94a3b8" }}
                  aria-hidden
                />
                <div>
                  <p className="truncate text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {t.startTime} – {t.endTime}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => remove(t.id)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-danger-soft hover:text-danger"
                aria-label={`${t.name} löschen`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Noch keine Vorlagen — unten die erste anlegen.</p>
      )}

      <div className="rounded-xl border border-border bg-surface/50 p-3">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Neue Vorlage
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs text-muted-foreground">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Bäcker-Früh"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              disabled={isPending}
            />
          </label>
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
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Farbe (optional)</span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-full cursor-pointer rounded-lg border border-border bg-background"
              disabled={isPending}
            />
          </label>
        </div>
        <Button type="button" variant="brand" size="md" className="mt-3 w-full sm:w-auto" disabled={isPending} onClick={submit}>
          <Clock className="mr-1.5 h-4 w-4" aria-hidden />
          Vorlage speichern
        </Button>
      </div>

      {message ? <p className="text-xs text-foreground">{message}</p> : null}
    </div>
  );
}
