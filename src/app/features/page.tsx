import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl, SEO_KEYWORDS } from "@/lib/seo/site";

const base = getSiteUrl();

export const metadata: Metadata = {
  title: "Features",
  description:
    "VREMA Features für die Gastronomie: 1-Klick-Stempeluhr, Echtzeit-Auswertungen, Schichtplanung, PDF-Reports, DATEV-Export und Privacy by Design – ohne GPS-Tracking.",
  keywords: [...SEO_KEYWORDS, "Schichtplanung", "PDF-Reports", "DATEV Export"],
  alternates: { canonical: `${base}/features` },
  openGraph: {
    title: "VREMA Features – Gastro-Planung & Zeiterfassung",
    description:
      "Alle Funktionen für Restaurants und Teams: Stempeluhr, Live-Reports, DSGVO-konforme Zeiterfassung und mehr.",
    url: `${base}/features`,
    locale: "de_DE",
    type: "website",
  },
};

const FEATURE_BULLETS = [
  {
    title: "1-Klick Stempeluhr",
    body: "Einstempeln, Pause, Ausstempeln – mobil oder am Terminal. Ideal für Gastro-Schichten.",
  },
  {
    title: "Echtzeit-Auswertungen",
    body: "Stunden, Wochen und Abweichungen sofort sehen – für Küche, Service und Büro.",
  },
  {
    title: "Privacy by Design",
    body: "Kein Standort-Tracking. DSGVO-konform – transparent für Mitarbeitende und Chefs.",
  },
  {
    title: "PDF-Reports & DATEV",
    body: "Stundenzettel und Exporte, die mit Lohnbuchhaltung und DATEV-Prozessen sprechen.",
  },
  {
    title: "QR-Terminal",
    body: "Robustes Einstempeln am festen Gerät – passend für belebte Servicezeiten.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto min-h-[70dvh] max-w-3xl px-4 py-16 text-foreground">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand">VREMA · Gastro-Planung</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Features für dein Team</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        VREMA bündelt <strong className="text-foreground">Zeiterfassung</strong>,{" "}
        <strong className="text-foreground">Schichtplanung</strong> und Reporting in einer Oberfläche – speziell
        gedacht für stressige Service- und Küchenabläufe.
      </p>

      <ul className="mt-10 space-y-6">
        {FEATURE_BULLETS.map((f) => (
          <li key={f.title} className="rounded-2xl border border-line bg-surface p-5 shadow-sm dark:border-white/10 dark:bg-surface/80">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{f.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </li>
        ))}
      </ul>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link
          href="/#features"
          className="inline-flex min-h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-brand-foreground transition-colors hover:brightness-105"
        >
          Zur interaktiven Übersicht
        </Link>
        <Link
          href="/preise"
          className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-5 text-sm font-semibold transition-colors hover:bg-surface-muted dark:border-white/10"
        >
          Preise ansehen
        </Link>
      </div>
    </div>
  );
}
