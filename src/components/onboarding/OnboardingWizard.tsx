"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { updateCompanySettings } from "@/lib/actions/settings";
import { useToast } from "@/components/ui/Toast";

/**
 * Smart-Onboarding-Wizard
 * 4 Schritte, eine Frage pro Karte. Speichert nach jedem „Weiter".
 * Bricht der User ab: Daten sind bereits persistiert, Re-Open lädt aktuellen Stand.
 */

const INDUSTRIES = [
  { id: "restaurant", label: "Restaurant" },
  { id: "cafe", label: "Café" },
  { id: "bar", label: "Bar" },
  { id: "hotel", label: "Hotel" },
  { id: "bakery", label: "Bäckerei" },
  { id: "canteen", label: "Kantine" },
  { id: "other", label: "Sonstige" },
];

const SHIFT_CYCLES = [
  { id: 1, label: "Jede Woche gleich", hint: "Stabile Crew, klare Routinen" },
  { id: 2, label: "Alle 2 Wochen rotierend", hint: "Z. B. Früh/Spät-Rotation" },
  { id: 3, label: "3-Wochen-Rhythmus", hint: "Komplexere Schichtmodelle" },
];

type Props = {
  companyName: string;
  initial: {
    locationZip: string;
    locationCity: string;
    estimatedWeeklyRevenue: number | null;
    shiftCycleWeeks: number;
  };
};

export function OnboardingWizard({ companyName, initial }: Props) {
  const router = useRouter();
  const { show } = useToast();
  const [pending, startTransition] = useTransition();

  const [step, setStep] = useState(1);
  const [industry, setIndustry] = useState<string>("restaurant");
  const [zip, setZip] = useState(initial.locationZip);
  const [city, setCity] = useState(initial.locationCity);
  const [revenue, setRevenue] = useState<string>(
    initial.estimatedWeeklyRevenue ? String(Math.round(initial.estimatedWeeklyRevenue)) : "",
  );
  const [cycleWeeks, setCycleWeeks] = useState(initial.shiftCycleWeeks);

  const total = 4;
  const progress = Math.round(((step - 1) / total) * 100);

  function next() {
    setStep((s) => Math.min(total, s + 1));
  }

  function prev() {
    setStep((s) => Math.max(1, s - 1));
  }

  function saveAndNext() {
    startTransition(async () => {
      try {
        // Wir speichern bei Schritt 2 (Ort) und Schritt 3 (Umsatz) – pro Schritt
        // nur die relevanten Felder, damit Vor-/Zurück-Sprünge nichts überschreiben.
        if (step === 2) {
          await updateCompanySettings({
            locationZip: zip || null,
            locationCity: city || null,
          });
        }
        if (step === 3) {
          const r = Number(revenue);
          if (Number.isFinite(r) && r >= 0) {
            await updateCompanySettings({ estimatedWeeklyRevenue: r });
          }
        }
        if (step === 4) {
          await updateCompanySettings({ shiftCycleWeeks: cycleWeeks });
        }

        if (step === total) {
          show("Onboarding abgeschlossen. Willkommen bei VREMA.", "success");
          router.push("/dashboard?onboarded=1");
          router.refresh();
          return;
        }
        next();
      } catch (e) {
        show(e instanceof Error ? e.message : "Speichern fehlgeschlagen.", "error");
      }
    });
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand">Willkommen bei VREMA</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Lass uns {companyName} startklar machen
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Vier kurze Fragen – danach ist dein Dashboard fertig konfiguriert.
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          <span>Schritt {step} von {total}</span>
          <span>{progress + Math.round(100 / total)} %</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-500"
            style={{ width: `${progress + 100 / total}%` }}
          />
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-md dark:border-white/[0.06] dark:bg-surface/70 sm:p-8">
        {step === 1 && (
          <Step
            heading="Was für ein Betrieb bist du?"
            sub="Wir nutzen das, um Beispiel-Schichtmodelle und Pausen-Defaults zu wählen."
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {INDUSTRIES.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => setIndustry(i.id)}
                  className={`flex items-center justify-center rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                    industry === i.id
                      ? "border-brand bg-brand-soft text-brand dark:bg-brand/15"
                      : "border-border bg-surface-muted/50 text-foreground hover:bg-surface-muted dark:bg-surface/40"
                  }`}
                >
                  {industry === i.id && <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden />}
                  {i.label}
                </button>
              ))}
            </div>
          </Step>
        )}

        {step === 2 && (
          <Step
            heading="Wo befindet sich dein Hauptbetrieb?"
            sub="Optional. Wir blenden lokales Wetter und Uhrzeit-Hinweise im Dashboard ein."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_1fr]">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">PLZ</span>
                <input
                  inputMode="numeric"
                  maxLength={5}
                  value={zip}
                  onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
                  className="input-field-subtle mt-1 w-full"
                  placeholder="10115"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stadt</span>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="input-field-subtle mt-1 w-full"
                  placeholder="Berlin"
                />
              </label>
            </div>
          </Step>
        )}

        {step === 3 && (
          <Step
            heading="Wie hoch ist der durchschnittliche Wochenumsatz?"
            sub="Brauchen wir nur intern für deine Lohnquote-Kennzahl. Niemand außerhalb deiner Firma sieht das."
          >
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">EUR pro Woche</span>
              <input
                inputMode="numeric"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value.replace(/[^0-9]/g, ""))}
                className="input-field-subtle mt-1 w-full"
                placeholder="8500"
              />
              <span className="mt-2 block text-[11px] text-muted-foreground">
                Du kannst diesen Wert jederzeit in den Einstellungen ändern.
              </span>
            </label>
          </Step>
        )}

        {step === 4 && (
          <Step
            heading="Wie wiederholt sich dein Schichtplan?"
            sub="Wir richten den Planer auf diesen Rhythmus aus."
          >
            <div className="space-y-2">
              {SHIFT_CYCLES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCycleWeeks(c.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                    cycleWeeks === c.id
                      ? "border-brand bg-brand-soft dark:bg-brand/15"
                      : "border-border bg-surface-muted/50 hover:bg-surface-muted dark:bg-surface/40"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.hint}</p>
                  </div>
                  {cycleWeeks === c.id && <CheckCircle2 className="h-5 w-5 text-brand" aria-hidden />}
                </button>
              ))}
            </div>
          </Step>
        )}

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={prev}
              disabled={pending}
              className="inline-flex h-11 items-center gap-1 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={saveAndNext}
            disabled={pending}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-brand-foreground shadow-sm transition-[transform,box-shadow] hover:shadow-md active:scale-[0.98] disabled:opacity-50"
          >
            {step === 4 ? (
              <>
                <Sparkles className="h-4 w-4" />
                Fertigstellen
              </>
            ) : (
              <>
                Weiter
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Später ausfüllen → direkt ins Dashboard
        </button>
      </div>
    </div>
  );
}

function Step({
  heading,
  sub,
  children,
}: {
  heading: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">{heading}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}
