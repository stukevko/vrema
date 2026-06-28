import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Fingerprint,
  Gauge,
  LineChart,
  MonitorSmartphone,
  ShieldCheck,
  Timer,
  CalendarDays,
} from "lucide-react";
import { getSiteUrl, SEO_KEYWORDS } from "@/lib/seo/site";
import { pricingTiersHint, trialMarketingParagraph } from "@/lib/marketing/trial-copy";

const base = getSiteUrl();

export const metadata: Metadata = {
  title: "Features",
  description:
    "VREMA Features: Stempeluhr, Schichtplan, Berichte, PDF & DATEV-Export — federleicht, DSGVO-konform, ohne GPS.",
  keywords: [...SEO_KEYWORDS, "Einsatzplanung", "PDF-Reports", "DATEV Export"],
  alternates: { canonical: `${base}/features` },
  openGraph: {
    title: "VREMA Features – Planung & Zeiterfassung",
    description:
      "Alle Funktionen für Teams in Gastro, Handwerk, Pflege und Handel: Stempeluhr, Live-Reports, DSGVO-konforme Zeiterfassung.",
    url: `${base}/features`,
    locale: "de_DE",
    type: "website",
  },
};

type Feature = {
  icon: typeof Timer;
  tag: string;
  title: string;
  body: string;
};

const HERO_KPIS = [
  { label: "Schichten in Sekunden geplant", value: "< 30s" },
  { label: "Zeit gespart pro Woche & Standort", value: "≈ 4 h" },
  { label: "DSGVO-konform, ohne GPS", value: "100 %" },
];

const FEATURES: Feature[] = [
  {
    icon: Timer,
    tag: "Stempeluhr",
    title: "1-Klick Stempeluhr",
    body: "Einstempeln, Pause, Ausstempeln – mobil oder am festen Terminal. Genau eine Geste pro Aktion, auch unter Stress im Betrieb.",
  },
  {
    icon: LineChart,
    tag: "Berichte",
    title: "Stunden & Exporte",
    body: "Monatsberichte, PDF-Stundenzettel und DATEV-CSV — klar für Chefs, nachvollziehbar fürs Lohnbüro.",
  },
  {
    icon: ShieldCheck,
    tag: "Privacy",
    title: "Privacy by Design",
    body: "Kein Standort-Tracking, kein GPS. Optional „Stempeln nur am Standort\u201C via Firmen-IP – DSGVO-konform, faktisch und zeigbar.",
  },
  {
    icon: ClipboardList,
    tag: "Reports",
    title: "PDF-Reports & DATEV",
    body: "Stundenzettel und Exporte, die mit Lohnbuchhaltung und DATEV-Prozessen sprechen. Eine Klick-Übergabe an deine:n Steuerberater:in.",
  },
  {
    icon: MonitorSmartphone,
    tag: "Terminal",
    title: "PIN-Terminal fürs Tablet",
    body: "Fester Link am Küchen- oder Service-Tablet — nur PIN eingeben, kein GPS. Ideal, wenn das Handy in der Spüle bleiben soll.",
  },
  {
    icon: CalendarDays,
    tag: "Planer",
    title: "Schichtplan per Drag & Drop",
    body: "Wochenplan auf dem Board — Schichten zuweisen, tauschen, drucken. Gleiche Ansicht auf Desktop und Handy, ohne parallele Excel-Welt.",
  },
];

const TRUST_BULLETS = [
  { icon: Gauge, label: "Glasklare Kennzahlen", body: "Anwesend jetzt, Lohnquote heute, Auffälligkeiten – als Hero-Stats direkt nach dem Login." },
  { icon: Fingerprint, label: "Sichere Anmeldung", body: "Passkeys und E-Mail-Verifikation — ohne Passwort-Chaos am Terminal." },
  { icon: ShieldCheck, label: "Daten in der EU", body: "Hosting in Deutschland, Backups verschlüsselt, klare AVV." },
];

export default function FeaturesPage() {
  return (
    <div className="w-full text-foreground">
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-border bg-background">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-32 -z-10 h-72 bg-gradient-to-b from-brand/15 via-transparent to-transparent"
        />
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:pt-24">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">VREMA · Teams & Betriebe</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Features, die im Betriebsstress halten – nicht nur in der Demo.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            VREMA bündelt <strong className="text-foreground">Zeiterfassung</strong>,{" "}
            <strong className="text-foreground">Einsatzplanung</strong> und Reporting in einer ruhigen Oberfläche – für
            Gastro, Handwerk, Pflege, Handel und Dienstleistung.
          </p>
          <p className="mt-3 max-w-2xl text-xs text-muted-foreground">{pricingTiersHint()}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/auth/register"
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-brand px-6 text-sm font-semibold text-brand-foreground shadow-sm transition-[transform,box-shadow] hover:shadow-md active:scale-[0.98]"
            >
              Kostenlos starten
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/#pricing"
              className="inline-flex min-h-12 items-center rounded-2xl border border-border bg-card px-6 text-sm font-semibold text-foreground transition-colors hover:bg-card/70"
            >
              Preise ansehen
            </Link>
          </div>

          {/* KPI-Strip */}
          <dl className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {HERO_KPIS.map((k) => (
              <div
                key={k.label}
                className="rounded-2xl border border-border bg-card/70 px-5 py-4 shadow-sm dark:border-white/[0.06] dark:bg-surface/40"
              >
                <dd className="text-2xl font-bold tracking-tight text-foreground">{k.value}</dd>
                <dt className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{k.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Feature-Grid */}
      <section className="border-b border-border bg-surface-muted/50 py-20 dark:bg-surface-muted/30">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Modular & alltagstauglich
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Alles, was eine Schicht im Griff hält
              </h2>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Sechs Bausteine, die du einzeln aktivieren kannst – oder als Komplett-Setup für dein Lokal.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-[1px] hover:border-brand/40 hover:shadow-md dark:border-white/[0.06] dark:bg-surface/70"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand/25 bg-brand-soft text-brand shadow-sm dark:border-white/10 dark:bg-brand/15">
                    <f.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {f.tag}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-bold tracking-tight text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Trust-Bar */}
      <section className="border-b border-border bg-background py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {TRUST_BULLETS.map((t) => (
              <div key={t.label} className="flex gap-4">
                <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-brand shadow-sm dark:border-white/[0.06] dark:bg-surface/70">
                  <t.icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Bereit, eine ruhige Schicht zu führen?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{trialMarketingParagraph()}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/auth/register"
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-brand px-6 text-sm font-semibold text-brand-foreground shadow-sm transition-[transform,box-shadow] hover:shadow-md active:scale-[0.98]"
            >
              Kostenlos starten
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/#pricing"
              className="inline-flex min-h-12 items-center rounded-2xl border border-border bg-card px-6 text-sm font-semibold text-foreground transition-colors hover:bg-card/70"
            >
              Preise ansehen
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
