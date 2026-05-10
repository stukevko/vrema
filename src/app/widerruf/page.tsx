import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Widerruf",
  description: "Hinweise zum Widerrufsrecht bei Vrema by KevkoStudio.",
};

export default function WiderrufPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
          <span>Vrema by KevkoStudio</span>
          <Link href="/" className="rounded-md border border-border px-3 py-1.5 text-foreground hover:bg-card/80">
            Zurück zur Startseite
          </Link>
        </div>

        <div className="space-y-5 rounded-2xl border border-border bg-card p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
          <h1 className="text-3xl font-bold">Widerrufsbelehrung</h1>
          <p className="text-sm text-muted-foreground">Kurz und transparent für Vrema als B2B-Produkt.</p>

          <section className="rounded-xl border border-line bg-surface-muted p-4 text-sm text-foreground">
            <h2 className="mb-2 font-semibold text-foreground">Hinweis zur Zielgruppe</h2>
          <p>
            Vrema richtet sich primär an Unternehmen und Gewerbetreibende (B2B). Für rein gewerbliche Verträge besteht grundsätzlich
            kein gesetzliches Widerrufsrecht.
          </p>
          <p>Verträge werden daher im Regelfall ausschließlich mit Unternehmern im Sinne des BGB geschlossen.</p>
          </section>

          <section className="rounded-xl border border-line bg-surface-muted p-4 text-sm text-foreground">
            <h2 className="mb-2 font-semibold text-foreground">Falls ausnahmsweise Verbraucher buchen</h2>
          <p>
            Sollte ein Vertrag mit einem Verbraucher geschlossen werden, gilt das gesetzliche Widerrufsrecht gemäß den jeweils
            anwendbaren Verbraucherschutzvorschriften.
          </p>
          <p>
            Für Rückfragen oder zur Ausübung eines Widerrufs kontaktiere bitte: kontakt@kevko.studio
          </p>
          </section>
        </div>
      </div>
    </main>
  );
}
