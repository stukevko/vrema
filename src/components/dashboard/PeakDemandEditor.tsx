"use client";

import { useState, useTransition } from "react";
import { savePeakDemandProfile, type PeakDemandProfile } from "@/lib/actions/peak-demand";
import { userErrorMessage } from "@/lib/errors/user-message";
import {
  PEAK_DAY_LABELS,
  PEAK_LEVEL_OPTIONS,
  type PeakDayLevel,
} from "@/lib/planning/peak-demand";
import { Button } from "@/components/ui/Button";
import { TrendingUp } from "lucide-react";

type Props = {
  initial: PeakDemandProfile;
  readOnly?: boolean;
};

export function PeakDemandEditor({ initial, readOnly = false }: Props) {
  const [levels, setLevels] = useState<PeakDayLevel[]>(initial.peakDayLevels);
  const [revenue, setRevenue] = useState(
    initial.estimatedWeeklyRevenue != null ? String(Math.round(initial.estimatedWeeklyRevenue)) : "",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const allDefault = levels.every((l) => l === "NORMAL");

  const setDay = (index: number, value: PeakDayLevel) => {
    setLevels((prev) => prev.map((v, i) => (i === index ? value : v)));
  };

  const onSave = () => {
    setMessage(null);
    startTransition(async () => {
      try {
        const revRaw = revenue.trim();
        const estimatedWeeklyRevenue = revRaw === "" ? null : Number(revRaw);
        if (estimatedWeeklyRevenue != null && (!Number.isFinite(estimatedWeeklyRevenue) || estimatedWeeklyRevenue < 0)) {
          setMessage("Bitte einen gültigen Wochenumsatz in Euro eingeben.");
          return;
        }
        await savePeakDemandProfile({ peakDayLevels: levels, estimatedWeeklyRevenue });
        setMessage("Gespeichert — der Planer nutzt dein Stoß-Profil ab sofort.");
      } catch (e: unknown) {
        setMessage(userErrorMessage(e, "Speichern fehlgeschlagen."));
      }
    });
  };

  return (
    <div className="space-y-6">
      {allDefault && !readOnly ? (
        <p className="rounded-xl border border-brand/20 bg-brand/5 px-3 py-2.5 text-sm text-foreground">
          Tipp: Markiere deine starken Tage (z. B. Fr/Sa) als <strong>Stoß</strong> — der Planer zeigt dann „Stoß · +1
          prüfen“, wenn Unterbesetzung droht.
        </p>
      ) : null}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-brand">
            <TrendingUp className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-bold text-foreground">Stoßzeiten pro Wochentag</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Kein Kassen-Import nötig: Markiere, an welchen Tagen du eher ruhig, normal oder Stoß erwartest. Der Planer
              zeigt dann z. B. „Stoß · +1 prüfen“ — immer als Richtwert, du entscheidest.
            </p>
          </div>
        </div>

        <ul className="mt-4 space-y-2">
          {PEAK_DAY_LABELS.map((label, index) => (
            <li
              key={label}
              className="flex flex-col gap-2 rounded-xl border border-border/70 bg-surface/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="w-10 text-sm font-bold text-foreground">{label}</span>
              <div
                className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-background p-1"
                role="group"
                aria-label={`Auslastung ${label}`}
              >
                {PEAK_LEVEL_OPTIONS.map((opt) => {
                  const active = levels[index] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={readOnly || isPending}
                      onClick={() => setDay(index, opt.value)}
                      className={`min-h-10 rounded-md px-2 text-xs font-semibold transition-colors ${
                        active
                          ? opt.value === "HIGH"
                            ? "bg-brand text-brand-foreground shadow-sm"
                            : opt.value === "LOW"
                              ? "bg-muted text-foreground"
                              : "bg-brand/15 text-brand"
                          : "text-muted-foreground hover:bg-muted/40"
                      }`}
                      title={opt.hint}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <label htmlFor="peak-weekly-revenue" className="text-sm font-semibold text-foreground">
          Geschätzter Wochenumsatz (optional)
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Grobe Orientierung für Lohnquote und Einblicke — keine Buchhaltung.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            id="peak-weekly-revenue"
            type="number"
            min={0}
            step={100}
            disabled={readOnly || isPending}
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
            placeholder="z. B. 8500"
            className="min-h-11 w-full max-w-xs rounded-lg border border-border bg-surface px-3 text-sm tabular-nums sm:w-48"
          />
          <span className="text-sm text-muted-foreground">€ / Woche</span>
        </div>
      </div>

      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="brand" size="md" disabled={isPending} onClick={onSave}>
            {isPending ? "Speichern…" : "Profil speichern"}
          </Button>
          {message ? (
            <p className="text-sm text-foreground" role="status">
              {message}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
