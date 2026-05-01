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
    <main className="min-h-screen bg-background px-6 py-16 text-slate-900">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-border bg-white px-4 py-3 text-xs text-slate-700 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
          <span className="font-sans text-muted-foreground">vrema — partner</span>
          <Link
            href="/"
            className="rounded-xl border border-border px-3 py-1.5 text-slate-900/85 hover:bg-card/70"
          >
            Zurück zur Startseite
          </Link>
        </div>

        <div className="space-y-8 rounded-2xl border border-border bg-card p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
          <h1 className="text-2xl font-bold tracking-tight">Partner werden</h1>

          <div className="space-y-4 text-base leading-relaxed text-slate-900">
            <p>Empfehlen Sie VREMA.</p>
            <p>Erhalten Sie 15 € pro Business-Kunden.</p>
            <p>Werden Sie Teil der VREMA-Erfolgsgeschichte.</p>
          </div>

          <a
            href={PARTNER_MAILTO}
            className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-black transition-all hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(150,255,180,0.3)] font-sans"
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
