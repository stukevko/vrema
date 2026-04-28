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
    <main className="min-h-screen bg-[#080808] px-6 py-16 text-white">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/70">
          <span className="font-mono text-white/50">vrema — partner</span>
          <Link
            href="/"
            className="rounded-md border border-white/15 px-3 py-1.5 text-white/85 hover:bg-white/10"
          >
            Zurück zur Startseite
          </Link>
        </div>

        <div className="space-y-8 rounded-2xl border border-white/10 bg-gradient-to-b from-[#121212] to-[#0c0c0c] p-8 shadow-[0_0_40px_rgba(34,197,94,0.06)]">
          <h1 className="text-2xl font-bold tracking-tight">Partner werden</h1>

          <div className="space-y-4 text-base leading-relaxed text-white/80">
            <p>Empfehlen Sie VREMA.</p>
            <p>Erhalten Sie 15 € pro Business-Kunden.</p>
            <p>Werden Sie Teil der VREMA-Erfolgsgeschichte.</p>
          </div>

          <a
            href={PARTNER_MAILTO}
            className="inline-flex w-full items-center justify-center rounded-xl bg-[#22c55e] px-6 py-3.5 text-sm font-bold text-black transition-colors hover:bg-[#16a34a] font-mono"
          >
            Jetzt Partner anfragen
          </a>

          <p className="text-center text-xs text-white/35 font-mono">
            Kein Login — Sie erhalten Ihren persönlichen Empfehlungslink per E-Mail.
          </p>
        </div>
      </div>
    </main>
  );
}
