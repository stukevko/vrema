import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Widerruf",
  description: "Hinweise zum Widerrufsrecht bei Vrema by KevkoStudio.",
};

export default function WiderrufPage() {
  return (
    <main className="min-h-screen bg-[#080808] px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/70">
          <span>Vrema by KevkoStudio</span>
          <Link href="/" className="rounded-md border border-white/15 px-3 py-1.5 text-white/85 hover:bg-white/10">
            Zurück zur Startseite
          </Link>
        </div>

        <div className="space-y-5 rounded-2xl border border-white/10 bg-gradient-to-b from-[#121212] to-[#0c0c0c] p-8 shadow-[0_0_40px_rgba(34,197,94,0.06)]">
          <h1 className="text-3xl font-bold">Widerrufsbelehrung</h1>
          <p className="text-sm text-white/60">Kurz und transparent für Vrema als B2B-Produkt.</p>

          <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/75">
            <h2 className="mb-2 font-semibold text-white">Hinweis zur Zielgruppe</h2>
          <p>
            Vrema richtet sich primär an Unternehmen und Gewerbetreibende (B2B). Für rein gewerbliche Verträge besteht grundsätzlich
            kein gesetzliches Widerrufsrecht.
          </p>
          <p>Verträge werden daher im Regelfall ausschließlich mit Unternehmern im Sinne des BGB geschlossen.</p>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/75">
            <h2 className="mb-2 font-semibold text-white">Falls ausnahmsweise Verbraucher buchen</h2>
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
