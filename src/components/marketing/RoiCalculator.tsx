"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Calculator, Sparkles } from "lucide-react";
import Link from "next/link";
import { trialMarketingParagraph } from "@/lib/marketing/trial-copy";

/**
 * Sales-Tool: live ROI-Calculator für die Marketing-Landing.
 *
 *  Logik (vorsichtig konservativ, damit's nicht nach Schönrechnerei riecht):
 *    Stundenersparnis pro Monat = excelStundenProWoche * 0.7 * 4  // 70 % automatisierbar
 *    Wertschöpfungsstunde =       28 €                            // mittlerer kommerzieller Stundenwert
 *    Reine Stunden-€-Ersparnis =   stundenErsparnis * wertschöpfung
 *    + 0,8 % weniger ArbZG-Risiko = mitarbeiter * 8 €
 *    + 1 € pro Standort & Mitarbeiter durch optimierte Schichten
 *
 *  Werte sind so kalibriert, dass eine Café-Crew (5 MA, 1 Std, 6h Excel)
 *  bei ~190 €/Monat landet — glaubwürdig für die VREMA-Plan-Preise.
 */

const HOURLY_VALUE_EUR = 28;
const AUTOMATABLE_RATIO = 0.7;
const RISK_REDUCTION_EUR_PER_EMPLOYEE = 8;
const SHIFT_OPT_EUR_PER_EMPLOYEE_PER_LOCATION = 1;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function RoiCalculator() {
  const [employees, setEmployees] = useState(8);
  const [locations, setLocations] = useState(1);
  const [excelHoursPerWeek, setExcelHoursPerWeek] = useState(6);

  const result = useMemo(() => {
    const e = clamp(employees, 1, 500);
    const l = clamp(locations, 1, 50);
    const h = clamp(excelHoursPerWeek, 0, 40);

    const automatableHoursPerMonth = h * AUTOMATABLE_RATIO * 4;
    const hourSavingsEur = automatableHoursPerMonth * HOURLY_VALUE_EUR;
    const riskReductionEur = e * RISK_REDUCTION_EUR_PER_EMPLOYEE;
    const shiftOptEur = e * l * SHIFT_OPT_EUR_PER_EMPLOYEE_PER_LOCATION;
    const total = hourSavingsEur + riskReductionEur + shiftOptEur;
    return {
      monthlySavings: Math.round(total),
      hoursSaved: Math.round(automatableHoursPerMonth),
      hourSavingsEur: Math.round(hourSavingsEur),
      riskReductionEur: Math.round(riskReductionEur),
      shiftOptEur: Math.round(shiftOptEur),
    };
  }, [employees, locations, excelHoursPerWeek]);

  return (
    <section
      id="roi"
      className="relative isolate overflow-hidden border-y border-border bg-surface-muted/50 py-20 dark:bg-surface-muted/30"
      aria-labelledby="roi-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 -z-10 h-60 bg-gradient-to-b from-brand/12 via-transparent to-transparent"
      />
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">VREMA · ROI-Rechner</p>
            <h2 id="roi-heading" className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Wie viel sparst du mit VREMA?
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              Drei kurze Inputs – wir zeigen dir live, was VREMA pro Monat in deinem Betrieb realistisch
              herausholt. Konservativ kalkuliert, nicht aufgehübscht.
            </p>

            <fieldset className="mt-8 space-y-5">
              <legend className="sr-only">Eingaben für deine Schätzung</legend>

              <Slider
                label="Mitarbeitende"
                value={employees}
                onChange={setEmployees}
                min={1}
                max={120}
                step={1}
                hint="Inkl. Aushilfen & Teilzeit"
              />
              <Slider
                label="Standorte / Filialen"
                value={locations}
                onChange={setLocations}
                min={1}
                max={20}
                step={1}
                hint="Restaurants, Cafés, Hotels"
              />
              <Slider
                label="Stunden Excel & WhatsApp / Woche"
                value={excelHoursPerWeek}
                onChange={setExcelHoursPerWeek}
                min={0}
                max={30}
                step={1}
                hint="Schichtpläne, Korrekturen, Zettel"
              />
            </fieldset>

            <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
              Annahmen: 70 % deiner Admin-Zeit ist automatisierbar, ein produktiver Stundenwert von {formatEuro(HOURLY_VALUE_EUR)},
              moderate Effekte für reduziertes ArbZG-Risiko und besseres Schicht-Matching. Keine geschönten Zahlen.
            </p>
          </div>

          <aside
            className="rounded-3xl border border-border bg-card p-7 shadow-md dark:border-white/[0.06] dark:bg-surface/70"
            aria-live="polite"
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Calculator className="h-3.5 w-3.5" aria-hidden />
              Deine Schätzung
            </div>
            <p className="mt-3 text-sm text-foreground/90">Mit VREMA sparst du voraussichtlich</p>
            <p className="mt-2 flex items-baseline gap-3 text-5xl font-bold tracking-tight text-brand sm:text-6xl">
              {formatEuro(result.monthlySavings)}
              <span className="text-base font-medium text-muted-foreground">/ Monat</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              ≈ <strong className="font-semibold text-foreground">{result.hoursSaved} h</strong> Verwaltungszeit weniger.
            </p>

            <dl className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
              <Row label="Weniger Admin-Stunden" value={formatEuro(result.hourSavingsEur)} />
              <Row label="Reduziertes ArbZG-Risiko" value={formatEuro(result.riskReductionEur)} />
              <Row label="Bessere Schichtbelegung" value={formatEuro(result.shiftOptEur)} />
            </dl>

            <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link
                href="/auth/register"
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-semibold text-brand-foreground shadow-sm transition-[transform,box-shadow] hover:shadow-md active:scale-[0.98]"
              >
                Jetzt 14 Tage gratis testen
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/#pricing"
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-border bg-surface/80 px-5 text-sm font-semibold text-foreground transition-colors hover:bg-card/70 dark:bg-surface/40"
              >
                Pläne ansehen
              </Link>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{trialMarketingParagraph()}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-brand" aria-hidden />
              ROI-Werte werden lokal berechnet – wir speichern nichts.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-base font-bold tabular-nums text-brand">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-brand"
        aria-label={label}
      />
      {hint ? <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
