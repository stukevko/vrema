import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl, SEO_KEYWORDS } from "@/lib/seo/site";

const base = getSiteUrl();

export const metadata: Metadata = {
  title: "Preise",
  description:
    "VREMA Preise für Gastronomie & Teams: transparente Pläne für Zeiterfassung und Gastro-Planung – Starter, Business und Enterprise.",
  keywords: [...SEO_KEYWORDS, "Preise Zeiterfassung", "Restaurant Software Preise"],
  alternates: { canonical: `${base}/preise` },
  openGraph: {
    title: "VREMA Preise – Gastro-Planung & Zeiterfassung",
    description: "Welcher Plan passt zu deinem Betrieb? Übersicht der VREMA-Tarife für Teams in der Gastronomie.",
    url: `${base}/preise`,
    locale: "de_DE",
    type: "website",
  },
};

const PLANS = [
  {
    name: "Starter",
    hint: "Kleine Teams, erste Digitalisierung",
    from: "ab 29 € / Monat",
  },
  {
    name: "Business",
    hint: "Mehr Standorte, mehr Automatisierung",
    from: "Staffelpreise auf Anfrage",
  },
  {
    name: "Enterprise",
    hint: "Individuelle SLAs & Onboarding",
    from: "Auf Anfrage",
  },
];

export default function PreisePage() {
  return (
    <div className="mx-auto min-h-[70dvh] max-w-3xl px-4 py-16 text-foreground">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand">VREMA · Tarife</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Preise für Gastro & Teams</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        Transparente Pakete für <strong className="text-foreground">Schichtplanung</strong> und{" "}
        <strong className="text-foreground">Zeiterfassung</strong> – skalierbar von der ersten Filiale bis zur Kette.
        Details und genaue Leistungsumfänge siehst du auf der Startseite unter Preise.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-sm dark:border-white/10 dark:bg-surface/80"
          >
            <h2 className="text-lg font-semibold tracking-tight">{p.name}</h2>
            <p className="mt-2 flex-1 text-xs text-muted-foreground">{p.hint}</p>
            <p className="mt-4 text-sm font-semibold text-brand">{p.from}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link
          href="/#pricing"
          className="inline-flex min-h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-brand-foreground transition-colors hover:brightness-105"
        >
          Volle Preistabelle &amp; Funktionen
        </Link>
        <Link
          href="/features"
          className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-5 text-sm font-semibold transition-colors hover:bg-surface-muted dark:border-white/10"
        >
          Features
        </Link>
      </div>
    </div>
  );
}
