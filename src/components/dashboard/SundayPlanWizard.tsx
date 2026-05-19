"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, ChevronRight, Sparkles, X } from "lucide-react";

const DISMISS_KEY = "vrema-sunday-wizard-dismissed";

type Props = {
  weekLabel: string;
  weekIndex: number;
};

export function SundayPlanWizard({ weekLabel, weekIndex }: Props) {
  const [visible, setVisible] = useState(true);
  const [step, setStep] = useState(1);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { until?: string };
        if (parsed.until && Date.now() < new Date(parsed.until).getTime()) {
          setVisible(false);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const dismissForWeek = () => {
    const until = new Date();
    until.setDate(until.getDate() + 7);
    localStorage.setItem(DISMISS_KEY, JSON.stringify({ until: until.toISOString() }));
    setVisible(false);
  };

  if (!visible) return null;

  const planningHref = `/dashboard/planning?focusWeek=${weekIndex}`;
  const autopilotSuggestHref = `/dashboard/planning?focusWeek=${weekIndex}&autopilot=suggest`;
  const autopilotFocusHref = `/dashboard/planning?focusWeek=${weekIndex}&autopilot=1`;

  return (
    <section className="order-1 rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/12 via-card to-card p-5 shadow-sm dark:from-brand/18">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
            <CalendarClock className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand">Woche planen</p>
            <h2 className="mt-0.5 text-base font-bold text-foreground sm:text-lg">Nächste Woche: {weekLabel}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Schritt {step} von 3 · mit Autopilot</p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismissForWeek}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted/50"
          aria-label="Ausblenden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {step === 1 ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Kurz den Personal-Tipp unter Einblicke lesen — oder direkt mit dem Autopilot starten.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/insights"
              className="btn-outline inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-semibold"
            >
              Personal-Tipp
            </Link>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn-primary-solid inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-semibold"
            >
              Weiter
              <ChevronRight className="ml-1 h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Autopilot schlägt Schichten als Entwurf vor — du prüfst und veröffentlichst erst, wenn es passt.
          </p>
          <Link
            href={autopilotSuggestHref}
            className="btn-primary-solid inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            Woche vorschlagen lassen
          </Link>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">Entwürfe im Planer prüfen und live schalten — dann sieht das Team die Woche.</p>
          <Link href={autopilotFocusHref} className="btn-primary-solid inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-semibold">
            Entwürfe prüfen & veröffentlichen
          </Link>
          <Link href={planningHref} className="block text-center text-xs font-semibold text-brand underline-offset-4 hover:underline">
            Nur Planer öffnen
          </Link>
        </div>
      ) : null}

      <ol className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <li className={`rounded-xl border px-3 py-2 ${step >= 1 ? "border-brand/30 bg-brand/5" : "border-border/60"}`}>
          1. Tipp
        </li>
        <li className={`rounded-xl border px-3 py-2 ${step >= 2 ? "border-brand/30 bg-brand/5" : "border-border/60"}`}>
          2. Vorschlagen
        </li>
        <li className={`rounded-xl border px-3 py-2 ${step >= 3 ? "border-brand/30 bg-brand/5" : "border-border/60"}`}>
          3. Live
        </li>
      </ol>
    </section>
  );
}
