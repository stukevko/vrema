import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Brain, Sparkles } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { VremaInsightsCard } from "@/components/dashboard/VremaInsightsCard";
import { PredictiveStaffingCard } from "@/components/dashboard/PredictiveStaffingCard";
import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "Einblicke",
  description: "Muster und Tipps aus deinen Planungs- und Zeitdaten.",
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
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Einblicke</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isManager
                ? "Voraus planen und zurückschauen — alles in Klartext aus deinen Schichten und Stempelzeiten."
                : "Deine persönlichen Kennzahlen findest du auf der Übersicht."}
            </p>
          </div>
        </div>
      </header>

      {isManager ? (
        <div className="space-y-6">
          <Suspense fallback={null}>
            <PredictiveStaffingCard />
          </Suspense>
          <Suspense fallback={null}>
            <VremaInsightsCard />
          </Suspense>
          <p className="text-center text-xs text-muted-foreground">
            <Link href="/dashboard" className="font-semibold text-brand hover:underline">
              Zur Übersicht
            </Link>
            {" · "}
            <Link href="/dashboard/planning" className="font-semibold text-brand hover:underline">
              Zum Planer
            </Link>
          </p>
        </div>
      ) : (
        <Card padded={false} className="p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Persönliche Kennzahlen und deine nächsten Schichten findest du auf der{" "}
                <Link href="/dashboard" className="font-semibold text-brand underline-offset-4 hover:underline">
                  Übersicht
                </Link>
                .
              </p>
              <p>
                <Link href="/dashboard/planning" className="font-semibold text-brand underline-offset-4 hover:underline">
                  Zum Planer
                </Link>
                {" · "}
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
