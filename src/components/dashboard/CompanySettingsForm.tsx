"use client";

import { useState, useTransition } from "react";
import { updateCompanySettings } from "@/lib/actions/settings";
import { Loader2, Save, ShieldCheck } from "lucide-react";

interface Props {
  company: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    logoUrl: string | null;
    shiftCycleWeeks: number;
    locationZip: string | null;
    locationCity: string | null;
    estimatedWeeklyRevenue: number | null;
  };
}

export function CompanySettingsForm({ company }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [shiftCycleWeeks, setShiftCycleWeeks] = useState(String(company.shiftCycleWeeks ?? 1));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const revRaw = String(fd.get("estimatedWeeklyRevenue") ?? "").trim();
        const estimatedWeeklyRevenue = revRaw === "" ? null : Number(revRaw);
        await updateCompanySettings({
          name: fd.get("name") as string,
          shiftCycleWeeks: Number(shiftCycleWeeks),
          locationZip: String(fd.get("locationZip") ?? "").trim() || null,
          locationCity: String(fd.get("locationCity") ?? "").trim() || null,
          estimatedWeeklyRevenue:
            estimatedWeeklyRevenue != null && Number.isFinite(estimatedWeeklyRevenue)
              ? estimatedWeeklyRevenue
              : null,
        });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Fehler beim Speichern.");
      }
    });
  };

  return (
    <div className="min-w-0 rounded-2xl bg-card backdrop-blur-xl border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-6">
      <form onSubmit={handleSubmit} className="min-w-0 space-y-5">
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex gap-3">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm text-foreground leading-snug">
            <p className="font-semibold">Privacy by Design</p>
            <p className="text-muted-foreground text-xs mt-1">
              VREMA erfasst keine Standortdaten. Zeiterfassung erfolgt ohne GPS – 100 % DSGVO-konform ohne
              Standort-Tracking.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <label className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest mb-1.5 block">
              Firmenname
            </label>
            <input
              name="name"
              type="text"
              defaultValue={company.name}
              required
              className="w-full min-w-0 px-3 py-3 sm:py-2.5 rounded-xl bg-white border border-border text-foreground text-sm focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>
          <div className="min-w-0">
            <label className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest mb-1.5 block">
              Firmen-Slug
            </label>
            <input
              value={company.slug}
              readOnly
              className="w-full min-w-0 px-3 py-3 sm:py-2.5 rounded-xl bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)] text-muted-foreground text-sm font-sans cursor-not-allowed"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <label className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest mb-1.5 block">
              PLZ (Wetter)
            </label>
            <input
              name="locationZip"
              type="text"
              defaultValue={company.locationZip ?? ""}
              placeholder="z. B. 10115"
              className="w-full min-w-0 px-3 py-3 sm:py-2.5 rounded-xl bg-white border border-border text-foreground text-sm focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>
          <div className="min-w-0">
            <label className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest mb-1.5 block">
              Ort (falls keine PLZ)
            </label>
            <input
              name="locationCity"
              type="text"
              defaultValue={company.locationCity ?? ""}
              placeholder="z. B. Berlin"
              className="w-full min-w-0 px-3 py-3 sm:py-2.5 rounded-xl bg-white border border-border text-foreground text-sm focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground -mt-2 font-sans">
          Für Wetter im Planer: OpenWeatherMap-API-Key in OPENWEATHER_API_KEY (Server). PLZ hat Vorrang vor Ort.
        </p>

        <div className="min-w-0">
          <label className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest mb-1.5 block">
            Geschätzter Wochenumsatz (EUR, optional)
          </label>
          <input
            name="estimatedWeeklyRevenue"
            type="number"
            min={0}
            step={100}
            defaultValue={company.estimatedWeeklyRevenue != null ? String(company.estimatedWeeklyRevenue) : ""}
            placeholder="z. B. 25000"
            className="w-full min-w-0 px-3 py-3 sm:py-2.5 rounded-xl bg-white border border-border text-foreground text-sm focus:outline-none focus:border-primary/40 transition-colors"
          />
          <p className="text-[10px] text-muted-foreground mt-1 font-sans">
            Wird mit geplanten Lohnkosten verglichen (&gt;35 % Lohnquote → Hinweis im Dashboard).
          </p>
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest mb-1.5 block">
            Schichtzyklus (Wochen)
          </label>
          <select
            value={shiftCycleWeeks}
            onChange={(e) => setShiftCycleWeeks(e.target.value)}
            className="w-full min-w-0 px-3 py-3 sm:py-2.5 rounded-xl bg-white border border-border text-foreground text-sm focus:outline-none focus:border-primary/40 transition-colors"
          >
            <option value="1">1 Woche (Standard)</option>
            <option value="2">2 Wochen</option>
            <option value="3">3 Wochen</option>
          </select>
          <p className="text-[10px] text-muted-foreground mt-1 font-sans">
            Legt fest, ob Planungsmuster wöchentlich, alle 2 Wochen oder alle 3 Wochen rotieren.
          </p>
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest mb-1.5 block">
            Aktueller Plan
          </label>
          <div className="px-3 py-2.5 rounded-xl bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)] flex items-center justify-between">
            <span className="text-sm font-sans text-primary font-bold">{company.plan}</span>
            <a
              href="/dashboard/billing"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans"
            >
              Upgrade →
            </a>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400 font-sans bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2">
            ✗ {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-foreground text-sm font-bold transition-colors hover:bg-primary/90 disabled:opacity-60 sm:w-auto sm:py-2.5"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {success ? "✓ Gespeichert" : "Speichern"}
        </button>
      </form>
    </div>
  );
}
