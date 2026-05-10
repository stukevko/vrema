import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookies",
  description: "Cookie-Hinweise für Vrema by KevkoStudio.",
};

export default function CookiesPage() {
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
          <h1 className="text-3xl font-bold">Cookie-Hinweise</h1>
          <p className="text-sm text-muted-foreground">Übersicht zu technisch notwendigen Cookies bei Vrema.</p>

          <section className="rounded-xl border border-line bg-surface-muted p-4 text-sm text-foreground">
            <h2 className="mb-2 font-semibold text-foreground">Technisch notwendige Cookies</h2>
          <p>
            Wir setzen Cookies ein, die für den sicheren Betrieb von Vrema erforderlich sind, z. B. für Login, Sitzung,
            CSRF-Schutz und Authentifizierung.
          </p>
          </section>

          <section className="rounded-xl border border-line bg-surface-muted p-4 text-sm text-foreground">
            <h2 className="mb-2 font-semibold text-foreground">Keine Marketing-Cookies ohne Einwilligung</h2>
          <p>
            Aktuell setzen wir keine optionalen Werbe- oder Tracking-Cookies ohne vorherige Einwilligung.
          </p>
          </section>

          <section className="rounded-xl border border-line bg-surface-muted p-4 text-sm text-foreground">
            <h2 className="mb-2 font-semibold text-foreground">Browser-Einstellungen</h2>
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
