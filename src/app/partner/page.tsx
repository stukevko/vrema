import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Partner werden",
  description:
    "Empfehlen Sie Vrema und verdienen Sie mit dem Partnerprogramm — bis zu 15 € pro geworbener Firma.",
};

const PARTNER_MAILTO = `mailto:kontakt@kevko.studio?subject=${encodeURIComponent("Interesse an VREMA Partnerschaft - All-in-One Zeiterfassung")}&body=${encodeURIComponent(
  "Hallo Kevin,\n\nich möchte VREMA-Partner werden und Unternehmen empfehlen (Bounty bis 15 € pro geworbener Firma).\n\nMit freundlichen Grüßen",
)}`;

export default function PartnerPage() {
  return (
    <main className="public-page px-6 py-16 text-foreground">
      <div className="mx-auto max-w-lg">
        <div className="public-card mb-6 flex items-center justify-between rounded-2xl px-4 py-3 text-xs text-foreground">
          <span className="font-sans text-muted-foreground">vrema — partner</span>
          <Link
            href="/"
            className="btn-secondary-outline rounded-xl px-3 py-1.5 text-foreground/85"
          >
            Zurück zur Startseite
          </Link>
        </div>

        <div className="public-card space-y-8 rounded-2xl p-8">
          <h1 className="text-2xl font-bold tracking-tight">Partner werden</h1>

          <div className="space-y-4 text-base leading-relaxed text-foreground">
            <p>Empfehlen Sie VREMA.</p>
            <p>Erhalten Sie 15 € pro Business-Kunden.</p>
            <p>Werden Sie Teil der VREMA-Erfolgsgeschichte.</p>
          </div>

          <a
            href={PARTNER_MAILTO}
            className="btn-primary-solid inline-flex w-full items-center justify-center rounded-xl px-6 py-3.5 text-sm font-bold font-sans"
          >
            Jetzt Partner anfragen
          </a>

          <p className="text-center text-xs text-muted-foreground font-sans">
            Kein Login — Sie erhalten Ihren persönlichen Empfehlungslink per E-Mail.
          </p>
        </div>
      </div>
    </main>
  );
}
