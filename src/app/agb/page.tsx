import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AGB",
  description: "Allgemeine Geschäftsbedingungen für Vrema by KevkoStudio.",
};

export default function AgbPage() {
  return (
    <main className="min-h-screen bg-[#080808] px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/70">
          <span>Vrema by KevkoStudio</span>
          <Link href="/" className="rounded-md border border-white/15 px-3 py-1.5 text-white/85 hover:bg-white/10">
            Zurück zur Startseite
          </Link>
        </div>

        <div className="space-y-6 rounded-2xl border border-white/10 bg-gradient-to-b from-[#121212] to-[#0c0c0c] p-8 shadow-[0_0_40px_rgba(34,197,94,0.06)]">
        <h1 className="text-3xl font-bold">Allgemeine Geschäftsbedingungen (AGB)</h1>
        <p className="text-sm text-white/65">
          Diese AGB gelten für die Nutzung der SaaS-Anwendung Vrema, bereitgestellt von KevkoStudio.
        </p>

        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/75">
          <h2 className="mb-2 font-semibold text-white">1. Anbieter und Geltungsbereich</h2>
          <p>
            Anbieter ist Kevin Konkin - KevkoStudio, Kolbstr. 5, 67346 Speyer, Deutschland, kontakt@kevko.studio.
            Diese AGB gelten für alle Verträge über die Nutzung von Vrema.
          </p>
          <p>
            Vrema richtet sich ausschließlich an Unternehmer im Sinne des BGB (B2B). Ein Vertrag mit Verbrauchern kommt
            grundsätzlich nicht zustande.
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/75">
          <h2 className="mb-2 font-semibold text-white">2. Vertragsgegenstand</h2>
          <p>
            Vertragsgegenstand ist die zeitlich befristete Bereitstellung der cloudbasierten Anwendung Vrema zur digitalen
            Arbeitszeiterfassung inklusive der jeweils im gebuchten Paket enthaltenen Funktionen.
          </p>
          <p>Der genaue Funktionsumfang ergibt sich aus der jeweils aktuellen Leistungsbeschreibung auf der Website.</p>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/75">
          <h2 className="mb-2 font-semibold text-white">3. Registrierung und Zugang</h2>
          <p>
            Der Kunde ist verpflichtet, bei Registrierung wahrheitsgemäße Angaben zu machen und Zugangsdaten vertraulich zu
            behandeln. Der Kunde ist für alle Aktivitäten unter seinen Accounts verantwortlich.
          </p>
          <p>
            Der Anbieter kann Accounts bei schwerwiegenden Verstößen gegen diese AGB vorübergehend sperren oder kündigen.
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/75">
          <h2 className="mb-2 font-semibold text-white">4. Preise, Abrechnung und Zahlung</h2>
          <p>Es gelten die auf der Website ausgewiesenen Preise zum Zeitpunkt des Vertragsschlusses.</p>
          <p>
            Abrechnung und Zahlungsabwicklung erfolgen über den angebundenen Zahlungsdienstleister (z. B. Stripe). Bei
            Zahlungsverzug oder fehlgeschlagener Zahlung kann der Zugang eingeschränkt werden.
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/75">
          <h2 className="mb-2 font-semibold text-white">5. Laufzeit, Verlängerung und Kündigung</h2>
          <p>
            Die Vertragslaufzeit richtet sich nach dem gebuchten Intervall (monatlich oder jährlich) und verlängert sich
            automatisch um die jeweilige Laufzeit, sofern nicht fristgerecht gekündigt wird.
          </p>
          <p>
            Kündigungen erfolgen über das bereitgestellte Billing-Portal oder in Textform an kontakt@kevko.studio.
            Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/75">
          <h2 className="mb-2 font-semibold text-white">6. Verfügbarkeit und Wartung</h2>
          <p>
            Der Anbieter bemüht sich um einen störungsfreien Betrieb. Wartungsfenster, sicherheitsrelevante Updates und
            technisch notwendige Unterbrechungen sind zulässig.
          </p>
          <p>
            Eine bestimmte ununterbrochene Verfügbarkeit wird, sofern nicht gesondert vereinbart, nicht geschuldet.
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/75">
          <h2 className="mb-2 font-semibold text-white">7. Pflichten des Kunden</h2>
          <p>
            Der Kunde darf die Anwendung nur im vertraglich vorgesehenen Rahmen nutzen und keine rechtswidrigen Inhalte
            verarbeiten. Er ist für die Rechtmäßigkeit der eingegebenen Daten verantwortlich.
          </p>
          <p>
            Der Kunde hat angemessene organisatorische und technische Schutzmaßnahmen für Endgeräte und Zugangsverwaltung
            zu treffen.
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/75">
          <h2 className="mb-2 font-semibold text-white">8. Haftung</h2>
          <p>
            Der Anbieter haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper
            oder Gesundheit.
          </p>
          <p>
            Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten ist die Haftung auf den vorhersehbaren,
            vertragstypischen Schaden begrenzt. Im Übrigen ist die Haftung ausgeschlossen, soweit gesetzlich zulässig.
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/75">
          <h2 className="mb-2 font-semibold text-white">9. Datenschutz und Auftragsverarbeitung</h2>
          <p>
            Die Verarbeitung personenbezogener Daten erfolgt gemäß Datenschutzhinweisen unter /datenschutz. Soweit
            erforderlich, wird eine Auftragsverarbeitungsvereinbarung (AVV) geschlossen.
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/75">
          <h2 className="mb-2 font-semibold text-white">10. Schlussbestimmungen</h2>
          <p>
            Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand für Kaufleute ist, soweit gesetzlich
            zulässig, Speyer.
          </p>
          <p>
            Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
          </p>
        </section>
        </div>
      </div>
    </main>
  );
}
