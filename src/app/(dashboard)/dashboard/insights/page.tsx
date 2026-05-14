import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Brain, Sparkles } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { VremaInsightsCard } from "@/components/dashboard/VremaInsightsCard";
import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "Insights",
  description: "VREMA Native AI – Muster und Empfehlungen aus Ihren Planungsdaten.",
};

export default async function InsightsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const role = session.user.role ?? "EMPLOYEE";
  const isManager = role === "COMPANY_OWNER" || role === "MANAGER" || role === "SUPER_ADMIN";

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-1 sm:px-0">
      <header className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Brain className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Insights</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isManager
                ? "Native AI: erkannte Muster aus Schichten, Zeiten und Abwesenheiten – ohne externe KI."
                : "Kompakte Übersicht für dich – detaillierte Betriebs-Insights sieht deine Führungskraft im Team-Dashboard."}
            </p>
          </div>
        </div>
      </header>

      {isManager ? (
        <Suspense fallback={null}>
          <VremaInsightsCard />
        </Suspense>
      ) : (
        <Card padded={false} className="p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Persönliche Kennzahlen und deine nächsten Schichten findest du auf dem{" "}
                <Link href="/dashboard" className="font-semibold text-brand underline-offset-4 hover:underline">
                  Dashboard
                </Link>
                . Aus Datenschutz- und Rollengründen sind ausführliche Betriebs-Insights nur für Führungskräfte
                sichtbar.
              </p>
              <p>
                <Link href="/dashboard/planning" className="font-semibold text-brand underline-offset-4 hover:underline">
                  Zum Planer
                </Link>{" "}
                ·{" "}
                <Link href="/dashboard/vacation" className="font-semibold text-brand underline-offset-4 hover:underline">
                  Urlaub
                </Link>
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
