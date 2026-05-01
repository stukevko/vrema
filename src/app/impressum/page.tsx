import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum von Vrema by KevkoStudio.",
};

export default function ImpressumPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-20 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-border bg-card p-8">
        <h1 className="text-3xl font-bold">Impressum</h1>
        <p className="text-sm text-slate-600">Angaben gemäß Paragraph 5 DDG</p>

        <section className="space-y-1 text-sm text-slate-800">
          <p>Kevin Konkin - KevkoStudio</p>
          <p>Kolbstr. 5</p>
          <p>67346 Speyer</p>
          <p>Deutschland</p>
        </section>

        <section className="space-y-1 text-sm text-slate-800">
          <p>E-Mail: kontakt@kevko.studio</p>
          <p>Telefon: +49 176 84844803</p>
        </section>

        <section className="space-y-1 text-sm text-slate-600">
          <p>Umsatzsteuer: Kleinunternehmerregelung gemäß Paragraph 19 UStG.</p>
          <p>Verantwortlich für journalistisch-redaktionelle Inhalte: Kevin Konkin, Anschrift wie oben.</p>
        </section>

        <section className="space-y-2 text-sm text-slate-600">
          <h2 className="font-semibold text-slate-900">Haftung für Links</h2>
          <p>
            Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links.
            Für den Inhalt verlinkter Seiten sind ausschließlich deren Betreiber verantwortlich.
          </p>
        </section>
      </div>
    </main>
  );
}
