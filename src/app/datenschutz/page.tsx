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
          <p>
            Accountdaten (Name, E-Mail), Organisationsdaten, Arbeitszeitdaten, Abwesenheiten (Urlaub, Krank, Sonderfälle).
            VREMA erfasst keine Standortdaten (Privacy by Design).
          </p>
          <p>
            <strong className="font-semibold">Urlaub:</strong> Es wird kein Urlaubsgrund abgefragt (Datenminimierung /
            BUrlG). Sichtbar sind Zeitraum, Status und Resturlaub für die Leitung.
          </p>
          <p>
            <strong className="font-semibold">Krankmeldung:</strong> Zeitraum und optional eine sachliche Notiz ohne
            medizinische Details. Optional kann ein AU-Nachweis (Foto/PDF) hochgeladen werden — Zugriff nur für
            Führungskräfte des Arbeitgebers, nicht für Kolleg:innen.
          </p>
          <p>Zwecke: Bereitstellung der Plattform, Authentifizierung, Abrechnung, Support, Sicherheit und Missbrauchsprävention.</p>
          <p>Vrema richtet sich primär an Unternehmen und gewerbliche Nutzer (B2B).</p>
        </section>

        <section className="space-y-2 text-sm text-foreground">
          <h2 className="font-semibold text-foreground">3. Rechtsgrundlagen</h2>
          <p>Art. 6 Abs. 1 lit. b DSGVO (Vertrag), lit. c (gesetzliche Pflichten), lit. f (berechtigtes Interesse).</p>
          <p>
            AU-Nachweise können Gesundheitsdaten sein: Art. 9 Abs. 2 lit. b DSGVO i. V. m. § 26 BDSG (Beschäftigtendatenschutz
            im Arbeitsverhältnis). Der jeweilige Arbeitgeber ist für die Rechtmäßigkeit im Personalprozess verantwortlich.
          </p>
        </section>

        <section className="space-y-2 text-sm text-foreground">
          <h2 className="font-semibold text-foreground">4. Empfänger und Dienstleister</h2>
          <p>Rechnungsstellung und Zahlung per Überweisung; E-Mail-Versand über Resend, Hosting/Serverbetrieb durch beauftragte Infrastrukturpartner.</p>
          <p>Mit Auftragsverarbeitern werden, soweit erforderlich, AV-Verträge abgeschlossen.</p>
        </section>

        <section className="space-y-2 text-sm text-foreground">
          <h2 className="font-semibold text-foreground">5. Speicherdauer</h2>
          <p>Account- und Profildaten: bis zur Löschung des Kontos, danach in der Regel bis zu 30 Tage technische Nachlaufzeit.</p>
          <p>Server- und Sicherheitslogs: 14 Tage.</p>
          <p>Support-Anfragen und Supportkommunikation: 24 Monate.</p>
          <p>Rechnungs- und steuerrelevante Unterlagen: 10 Jahre gemäß gesetzlicher Aufbewahrungspflichten.</p>
          <p>AU-Nachweise (optional): 3 Jahre ab Upload, danach automatische Löschung der Datei in VREMA.</p>
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
          <h2 className="font-semibold text-foreground">7. Rollen im Dashboard (Überblick)</h2>
          <p>
            <strong className="font-semibold">Mitarbeitende</strong> sehen eigene Anträge und Schichten; keine AU-Dateien
            oder Anträge anderer Personen; im Team keine Stundenlöhne von Kolleg:innen.
          </p>
          <p>
            <strong className="font-semibold">Führungskräfte</strong> sehen Team-Abwesenheiten zur Planung und Freigabe;
            AU-Nachweise nur über einen gesicherten Einzelabruf; Urlaubsgründe werden nicht erhoben.
          </p>
        </section>

        <section className="space-y-2 text-sm text-foreground">
          <h2 className="font-semibold text-foreground">8. Ihre Rechte</h2>
          <p>Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch sowie Beschwerde bei einer Aufsichtsbehörde.</p>
          <p>
            Im Arbeitsverhältnis wendet sich der/die Beschäftigte in der Regel an den Arbeitgeber (Verantwortlicher).
            Anfragen an den Plattformbetreiber: kontakt@kevko.studio
          </p>
        </section>
      </div>
    </main>
  );
}
