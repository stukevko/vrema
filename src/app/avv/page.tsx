import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AVV",
  description: "Auftragsverarbeitungsvertrag (AVV) für Vrema by KevkoStudio.",
};

export default function AvvPage() {
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
          <h1 className="text-3xl font-bold">Auftragsverarbeitungsvertrag (AVV)</h1>
          <p className="text-sm text-muted-foreground">
            Vorlage für B2B-Kunden von Vrema. Diese Seite dient als schnell nutzbare Standardversion.
          </p>

          <section className="rounded-xl border border-line bg-surface-muted p-4 text-sm text-foreground">
            <h2 className="mb-2 font-semibold text-foreground">1. Parteien</h2>
            <p>Verantwortlicher: Kunde (Unternehmen, das Vrema nutzt).</p>
            <p>Auftragsverarbeiter: Kevin Konkin - KevkoStudio, Kolbstr. 5, 67346 Speyer, kontakt@kevko.studio.</p>
          </section>

          <section className="rounded-xl border border-line bg-surface-muted p-4 text-sm text-foreground">
            <h2 className="mb-2 font-semibold text-foreground">2. Gegenstand und Dauer</h2>
            <p>
              Gegenstand ist die Verarbeitung personenbezogener Daten zur Bereitstellung der SaaS-Anwendung Vrema
              (Zeiterfassung, Berichte, Teamverwaltung, Abrechnung).
            </p>
            <p>Die Dauer entspricht der Laufzeit des Hauptvertrags (Abo).</p>
          </section>

          <section className="rounded-xl border border-line bg-surface-muted p-4 text-sm text-foreground">
            <h2 className="mb-2 font-semibold text-foreground">3. Art der Daten und Kategorien Betroffener</h2>
            <p>
              Datenarten: Stammdaten, Kontaktdaten, Arbeitszeitdaten, technische Metadaten. Keine Standortdaten.
            </p>
            <p>Betroffene: Mitarbeiter, Teamleiter, Kundenadministratoren.</p>
          </section>

          <section className="rounded-xl border border-line bg-surface-muted p-4 text-sm text-foreground">
            <h2 className="mb-2 font-semibold text-foreground">4. Technische und organisatorische Massnahmen (TOM)</h2>
            <p>
              Zugriffsschutz über Authentifizierung und Rollenmodell, Transportverschlüsselung, Protokollierung,
              Backup- und Restore-Prozesse, Berechtigungstrennung, regelmäßige Sicherheitsupdates.
            </p>
          </section>

          <section className="rounded-xl border border-line bg-surface-muted p-4 text-sm text-foreground">
            <h2 className="mb-2 font-semibold text-foreground">5. Unterauftragsverarbeiter</h2>
            <p>Je nach Nutzung können unter anderem folgende Anbieter eingesetzt werden:</p>
            <p>- Hosting/Infrastrukturanbieter</p>
            <p>- Resend (transaktionale E-Mails)</p>
          </section>

          <section className="rounded-xl border border-line bg-surface-muted p-4 text-sm text-foreground">
            <h2 className="mb-2 font-semibold text-foreground">6. Weisungen, Unterstützung und Löschung</h2>
            <p>
              Verarbeitung erfolgt nur auf dokumentierte Weisung des Verantwortlichen. Der Auftragsverarbeiter unterstützt
              bei Betroffenenrechten und löscht Daten nach Vertragsende oder gem. gesetzlichen Fristen.
            </p>
          </section>

          <section className="rounded-xl border border-brand/25 bg-brand-soft p-4 text-sm text-foreground dark:border-white/10 dark:bg-brand/18">
            <h2 className="mb-2 font-semibold text-brand">Schnellstart für Kunden</h2>
            <p>
              Diese AVV-Version kann vom Kunden als Standard-AVV genutzt werden. Für individuelle Anforderungen:
              kontakt@kevko.studio
            </p>
            <p className="mt-2">
              Tipp: Im Browser kann die Seite direkt als PDF gespeichert werden (Drucken -&gt; Als PDF speichern).
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
