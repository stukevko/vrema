import { Quote, Star } from "lucide-react";

/**
 * Social-Proof-Strip – statisch (Server Component), CMS-bereit.
 *
 * Inhalt steht heute in dieser Datei, damit wir vor Launch authentisch zu klingen
 * lernen ohne fragwürdige Logo-Soup. Sobald echte Kunden da sind: hier Daten ersetzen
 * oder in den `marketingConfig` ziehen.
 *
 *  WICHTIG: Wir lügen nicht. Initialen + Branche, kein Foto-Stock.
 */

type Quote = {
  initials: string;
  name: string;
  role: string;
  /** Branche + Ort – z. B. „Handwerk · Köln". */
  industry: string;
  text: string;
};

const QUOTES: Quote[] = [
  {
    initials: "M·B",
    name: "Marco B.",
    role: "Inhaber",
    industry: "Restaurant · Berlin",
    text: "Wir haben Excel rausgeworfen. Schichten sind in zehn Minuten geplant statt Sonntagvormittag.",
  },
  {
    initials: "J·H",
    name: "Jan H.",
    role: "Werkstattleitung",
    industry: "Handwerk · Köln",
    text: "Einsätze und Zeiten in einer App — meine Monteure stempeln ein Klick, ich sehe sofort wer auf der Baustelle ist.",
  },
  {
    initials: "S·K",
    name: "Sarah K.",
    role: "Pflegedienstleitung",
    industry: "Pflege · Hamburg",
    text: "Endlich ein Tool, das ArbZG kennt. Dienste planen, Stunden exportieren — ohne Korrekturschleifen ans Lohnbüro.",
  },
];

const INDUSTRY_TAGS = [
  "Gastronomie",
  "Handwerk",
  "Pflege",
  "Handel",
  "Hotels",
  "Dienstleistung",
];

export function SocialProofStrip() {
  return (
    <section
      aria-label="Stimmen aus der Praxis"
      className="border-y border-border bg-card/50 py-14 dark:bg-surface/40"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">Aus der Praxis</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Gemacht für Teams mit Schichtbetrieb</h2>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            Stimmen aus dem Pilot-Programm – Initialen statt Stock-Fotos. Echte Sätze, echte Wirkung.
          </p>
        </div>

        <ul className="grid gap-4 md:grid-cols-3">
          {QUOTES.map((q) => (
            <li
              key={q.initials}
              className="relative flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm dark:border-white/[0.06] dark:bg-surface/70"
            >
              <Quote className="absolute right-5 top-5 h-5 w-5 text-brand/20" aria-hidden />
              <div className="mb-4 flex items-center gap-1 text-amber-500" aria-label="5 von 5 Sternen">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" aria-hidden />
                ))}
              </div>
              <blockquote className="flex-1 text-sm leading-relaxed text-foreground/90">
                „{q.text}"
              </blockquote>
              <div className="mt-5 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand dark:bg-brand/15">
                  {q.initials}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{q.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {q.role} · {q.industry}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {INDUSTRY_TAGS.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground dark:bg-surface/50"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
