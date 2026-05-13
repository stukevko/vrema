"use client";

import { useState, useTransition } from "react";
import { updateClockGeofence } from "@/lib/actions/clock-geofence";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { Tooltip } from "@/components/ui/Tooltip";
import { Loader2, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";

type Props = {
  initial: {
    enabled: boolean;
    allowlist: string[];
  };
};

export function ClockGeofenceSection({ initial }: Props) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [allowlist, setAllowlist] = useState<string[]>(initial.allowlist);
  const [newEntry, setNewEntry] = useState("");
  const [isPending, startTransition] = useTransition();
  const { toasts, show, remove } = useToast();

  const addEntry = () => {
    const trimmed = newEntry.trim();
    if (!trimmed) return;
    if (allowlist.includes(trimmed)) {
      show("Eintrag ist bereits in der Liste.", "error");
      return;
    }
    setAllowlist((prev) => [...prev, trimmed]);
    setNewEntry("");
  };

  const removeEntry = (entry: string) => {
    setAllowlist((prev) => prev.filter((e) => e !== entry));
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateClockGeofence({ enabled, allowlist });
        show(
          enabled
            ? "IP-Geofencing aktualisiert — Stempeln nur noch von freigegebenen IPs."
            : "IP-Geofencing deaktiviert.",
          "success",
        );
      } catch (err) {
        show(err instanceof Error ? err.message : "Speichern fehlgeschlagen.", "error");
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line/60 bg-surface/70 p-4 dark:border-white/[0.06] dark:bg-surface/50">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Stempeln nur am Standort</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Wenn aktiv, sind Clock-Ins nur aus dem Firmen-Netz möglich. Privacy-first: kein GPS,
              keine Geolocation – wir prüfen ausschließlich die ausgehende IP-Adresse deines Routers.
            </p>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-line"
              />
              <span className="text-sm font-medium text-foreground">Geofencing via IP aktivieren</span>
            </label>
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          IP-Allowlist (Plain oder CIDR)
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addEntry();
              }
            }}
            placeholder="z. B. 203.0.113.0/24  oder  198.51.100.42  oder  2001:db8::/32"
            className="input-field-subtle h-11 w-full rounded-xl px-3 text-sm font-mono"
          />
          <button
            type="button"
            onClick={addEntry}
            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-brand/40 bg-brand-soft px-4 text-sm font-bold text-brand hover:border-brand/60"
          >
            <Plus className="h-4 w-4" /> Hinzufügen
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Tipp: deine aktuelle externe IP findest du z. B. unter{" "}
          <Tooltip content="Externe Quelle – wir laden nichts automatisch.">
            <a
              href="https://ipv4.icanhazip.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:underline"
            >
              ipv4.icanhazip.com
            </a>
          </Tooltip>
          .
        </p>
      </div>

      {allowlist.length > 0 ? (
        <ul className="space-y-2">
          {allowlist.map((entry) => (
            <li
              key={entry}
              className="flex items-center justify-between gap-3 rounded-xl border border-line/60 bg-surface/60 px-3 py-2 dark:border-white/[0.06] dark:bg-surface/40"
            >
              <code className="truncate font-mono text-sm text-foreground">{entry}</code>
              <button
                type="button"
                onClick={() => removeEntry(entry)}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-300/40 bg-rose-50/60 px-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-300/20 dark:bg-rose-500/10 dark:text-rose-200"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Entfernen
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-line/60 bg-surface/40 px-4 py-6 text-center text-xs text-muted-foreground">
          Noch keine Einträge in der Allowlist.
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="btn-brand inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold disabled:opacity-60"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Einstellungen speichern
      </button>

      <ToastContainer toasts={toasts} remove={remove} />
    </div>
  );
}
