import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutz",
  description: "Datenschutzhinweise für Vrema by KevkoStudio.",
};

export default function DatenschutzPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-20 text-foreground">
      <div className="mx-auto max-w-3xl space-y-8 rounded-2xl border border-border bg-card p-8">
        <h1 className="text-3xl font-bold">Datenschutz</h1>
        <p className="text-sm text-muted-foreground">
          Diese Hinweise beschreiben die Verarbeitung personenbezogener Daten bei der Nutzung von Vrema.
        </p>

        <section className="space-y-2 text-sm text-foreground">
          <h2 className="font-semibold text-foreground">1. Verantwortlicher</h2>
          <p>Kevin Konkin - KevkoStudio, Kolbstr. 5, 67346 Speyer, kontakt@kevko.studio</p>
        </section>

        <section className="space-y-2 text-sm text-foreground">
          <h2 className="font-semibold text-foreground">2. Verarbeitete Daten und Zwecke</h2>
          <p>Accountdaten (Name, E-Mail), Organisationsdaten, Arbeitszeitdaten, optionale Standortdaten zur Zeiterfassung.</p>
          <p>Zwecke: Bereitstellung der Plattform, Authentifizierung, Abrechnung, Support, Sicherheit und Missbrauchsprävention.</p>
          <p>Vrema richtet sich primär an Unternehmen und gewerbliche Nutzer (B2B).</p>
        </section>

        <section className="space-y-2 text-sm text-foreground">
          <h2 className="font-semibold text-foreground">3. Rechtsgrundlagen</h2>
          <p>Art. 6 Abs. 1 lit. b DSGVO (Vertrag), lit. c (gesetzliche Pflichten), lit. f (berechtigtes Interesse).</p>
        </section>

        <section className="space-y-2 text-sm text-foreground">
          <h2 className="font-semibold text-foreground">4. Empfänger und Dienstleister</h2>
          <p>Zahlungen über Stripe, E-Mail-Versand über Resend, Hosting/Serverbetrieb durch beauftragte Infrastrukturpartner.</p>
          <p>Mit Auftragsverarbeitern werden, soweit erforderlich, AV-Verträge abgeschlossen.</p>
        </section>

        <section className="space-y-2 text-sm text-foreground">
          <h2 className="font-semibold text-foreground">5. Speicherdauer</h2>
          <p>Account- und Profildaten: bis zur Löschung des Kontos, danach in der Regel bis zu 30 Tage technische Nachlaufzeit.</p>
          <p>Server- und Sicherheitslogs: 14 Tage.</p>
          <p>Support-Anfragen und Supportkommunikation: 24 Monate.</p>
          <p>Rechnungs- und steuerrelevante Unterlagen: 10 Jahre gemäß gesetzlicher Aufbewahrungspflichten.</p>
        </section>

        <section className="space-y-2 text-sm text-foreground">
          <h2 className="font-semibold text-foreground">6. Cookies und technische Speicherung</h2>
          <p>
            Vrema verwendet technisch notwendige Cookies, z. B. für Login/Sitzung und Sicherheit. Ohne diese Cookies ist der Betrieb
            der Anwendung nicht möglich.
          </p>
          <p>Es werden keine Analyse-, Marketing- oder Newsletter-Tracking-Cookies eingesetzt.</p>
        </section>

        <section className="space-y-2 text-sm text-foreground">
          <h2 className="font-semibold text-foreground">7. Ihre Rechte</h2>
          <p>Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch sowie Beschwerde bei einer Aufsichtsbehörde.</p>
          <p>Anfragen bitte an: kontakt@kevko.studio</p>
        </section>
      </div>
    </main>
  );
}
