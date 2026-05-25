"use client";
import { userErrorMessage } from "@/lib/errors/user-message";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCompanySettings } from "@/lib/actions/settings";
import { RevenueCsvImport } from "@/components/dashboard/RevenueCsvImport";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { GERMAN_REGION_LABELS, type GermanRegion } from "@/lib/holidays/de";
import { CategoryIcon } from "@/components/dashboard/CategoryIcon";

type IndustryValue =
  | "RESTAURANT"
  | "CAFE"
  | "BAR"
  | "HOTEL"
  | "BAKERY"
  | "CANTEEN"
  | "CLUB"
  | "CATERING"
  | "OTHER";

const INDUSTRY_OPTIONS: Array<{ value: IndustryValue; label: string; hint: string }> = [
  { value: "RESTAURANT", label: "Gastgewerbe (Restaurant)", hint: "Mittag- und Abendspitzen, klassische Dienst-Schichten" },
  { value: "CAFE", label: "Café", hint: "Morgens & nachmittags stärker, wetterabhängige Außenbereiche" },
  { value: "BAR", label: "Bar / Nachtbetrieb", hint: "Abend-/Nacht-Profil, Wochenende oft höher" },
  { value: "HOTEL", label: "Hotel", hint: "Stetigere Auslastung, Wochenend-Brückentage stärker" },
  { value: "BAKERY", label: "Bäckerei", hint: "Sehr früher Tagesbeginn, Werktage stärker" },
  { value: "CANTEEN", label: "Kantine / Gemeinschaftsverpflegung", hint: "Werktags Mittag, Wochenende ruhiger" },
  { value: "CLUB", label: "Veranstaltung / Club", hint: "Schwerpunkt Wochenende, längere Schichtfenster" },
  { value: "CATERING", label: "Catering / Events", hint: "Event-getrieben, unregelmäßige Spitzen" },
  { value: "OTHER", label: "Sonstiges", hint: "Allgemeines Betriebsprofil" },
];

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
    industry: IndustryValue | null;
    region: string | null;
  };
}

export function CompanySettingsForm({ company }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [shiftCycleWeeks, setShiftCycleWeeks] = useState(String(company.shiftCycleWeeks ?? 1));
  const [industry, setIndustry] = useState<IndustryValue | "">(company.industry ?? "");
  const [region, setRegion] = useState<GermanRegion | "">(
    (company.region as GermanRegion | null) ?? "",
  );

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
          industry: industry === "" ? null : industry,
          region: region === "" ? null : region,
        });
        setSuccess(true);
        router.refresh();
        setTimeout(() => setSuccess(false), 3000);
      } catch (err: unknown) {
        setError(
          userErrorMessage(
            err,
            "Die Firmeneinstellungen konnten nicht gespeichert werden. Bitte überprüfe deine Eingaben.",
          ),
        );
      }
    });
  };

  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)] dark:border-white/10 dark:bg-surface/90">
      <form onSubmit={handleSubmit} className="min-w-0 space-y-5">
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex gap-3">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm text-foreground leading-snug">
            <p className="font-semibold">Datenschutz beim Stempeln</p>
            <p className="text-muted-foreground text-xs mt-1">
              VREMA erfasst keine GPS-Standorte. Die Zeiterfassung läuft ohne Ortungs-App – optional nur
              über das Firmen-WLAN (siehe Standortprüfung unten).
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
          Für die Wetterzeile im Planer und die Personal-Empfehlung. PLZ hat Vorrang vor Ort.
        </p>

        {/* Betrieb & Standort – steuert Predictive- und AI-Heuristiken */}
        <div className="rounded-xl border border-line bg-card/40 p-4 dark:bg-surface/40">
          <p className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest mb-3">
            Betrieb & Standort · steuert Personal-Vorhersage und Feiertage
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <label className="mb-1.5 flex items-center gap-2 font-sans text-[10px] uppercase tracking-widest text-muted-foreground">
                <CategoryIcon industry={industry || null} className="h-4 w-4 text-brand" aria-hidden />
                Betriebskategorie
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value as IndustryValue | "")}
                className="w-full min-w-0 px-3 py-3 sm:py-2.5 rounded-xl bg-white border border-border text-foreground text-sm focus:outline-none focus:border-primary/40 transition-colors dark:bg-surface"
              >
                <option value="">— nicht festgelegt —</option>
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground mt-1 font-sans">
                {INDUSTRY_OPTIONS.find((o) => o.value === industry)?.hint ??
                  "Beeinflusst Wochenprofil & Spitzen-Erkennung in der Vorhersage."}
              </p>
            </div>
            <div className="min-w-0">
              <label className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest mb-1.5 block">
                Bundesland (Feiertage)
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as GermanRegion | "")}
                className="w-full min-w-0 px-3 py-3 sm:py-2.5 rounded-xl bg-white border border-border text-foreground text-sm focus:outline-none focus:border-primary/40 transition-colors dark:bg-surface"
              >
                <option value="">— nicht festgelegt —</option>
                {(Object.keys(GERMAN_REGION_LABELS) as GermanRegion[]).map((code) => (
                  <option key={code} value={code}>
                    {GERMAN_REGION_LABELS[code]}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground mt-1 font-sans">
                Ermöglicht Feiertage, Brückentage und länderspezifische Spitzen.
              </p>
            </div>
          </div>
        </div>

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
          <div className="mt-4">
            <RevenueCsvImport />
          </div>
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
            <option value="1">1 Woche</option>
            <option value="2">2 Wochen</option>
            <option value="3">3 Wochen</option>
            <option value="4">4 Wochen (empfohlen)</option>
          </select>
          <p className="text-[10px] text-muted-foreground mt-1 font-sans">
            Wie viele Kalenderwochen du im Planer gleichzeitig belegen kannst (bis zu 4 Wochen voraus).
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
