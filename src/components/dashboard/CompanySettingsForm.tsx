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
        await updateCompanySettings({
          name: fd.get("name") as string,
          shiftCycleWeeks: Number(shiftCycleWeeks),
        });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Fehler beim Speichern.");
      }
    });
  };

  return (
    <div className="rounded-2xl bg-card backdrop-blur-xl border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-6">
      <form onSubmit={handleSubmit} className="space-y-5">
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

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest mb-1.5 block">
              Firmenname
            </label>
            <input
              name="name"
              type="text"
              defaultValue={company.name}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-border text-foreground text-sm focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest mb-1.5 block">
              Firmen-Slug
            </label>
            <input
              value={company.slug}
              readOnly
              className="w-full px-3 py-2.5 rounded-xl bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)] text-muted-foreground text-sm font-sans cursor-not-allowed"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest mb-1.5 block">
            Schichtzyklus (Wochen)
          </label>
          <select
            value={shiftCycleWeeks}
            onChange={(e) => setShiftCycleWeeks(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-white border border-border text-foreground text-sm focus:outline-none focus:border-primary/40 transition-colors"
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
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-foreground font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {success ? "✓ Gespeichert" : "Speichern"}
        </button>
      </form>
    </div>
  );
}
