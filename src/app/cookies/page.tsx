import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookies",
  description: "Cookie-Hinweise für Vrema by KevkoStudio.",
};

export default function CookiesPage() {
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
          <h1 className="text-3xl font-bold">Cookie-Hinweise</h1>
          <p className="text-sm text-white/60">Übersicht zu technisch notwendigen Cookies bei Vrema.</p>

          <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/75">
            <h2 className="mb-2 font-semibold text-white">Technisch notwendige Cookies</h2>
          <p>
            Wir setzen Cookies ein, die für den sicheren Betrieb von Vrema erforderlich sind, z. B. für Login, Sitzung,
            CSRF-Schutz und Authentifizierung.
          </p>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/75">
            <h2 className="mb-2 font-semibold text-white">Keine Marketing-Cookies ohne Einwilligung</h2>
          <p>
            Aktuell setzen wir keine optionalen Werbe- oder Tracking-Cookies ohne vorherige Einwilligung.
          </p>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/75">
            <h2 className="mb-2 font-semibold text-white">Browser-Einstellungen</h2>
          <p>
            Du kannst Cookies in deinem Browser löschen oder blockieren. Beachte, dass dadurch Funktionen der Anwendung
            eingeschränkt sein können.
          </p>
          </section>
        </div>
      </div>
    </main>
  );
}
