import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Brain } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { VremaInsightsCard } from "@/components/dashboard/VremaInsightsCard";
import { PredictiveStaffingCard } from "@/components/dashboard/PredictiveStaffingCard";
import { ComplianceCard } from "@/components/dashboard/ComplianceCard";
import { PlanVsIstCard } from "@/components/dashboard/PlanVsIstCard";
import { RevenueSignalCard } from "@/components/dashboard/RevenueSignalCard";
import { DashboardAISection } from "@/components/dashboard/DashboardAISection";
import { AsyncAIInsights, AIInsightsSkeleton } from "@/components/dashboard/AsyncAIInsights";
import {
  DashboardManagerGuidance,
  DashboardGuidanceSection,
} from "@/components/dashboard/DashboardManagerGuidance";

export const metadata = {
  title: "Einblicke",
  description: "Planungs- und Betriebshinweise aus deinen Schicht- und Zeitdaten.",
};

export default async function InsightsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const role = session.user.role ?? "EMPLOYEE";
  const isManager = role === "COMPANY_OWNER" || role === "MANAGER" || role === "SUPER_ADMIN";
  const companyId = session.user.companyId;

  if (!isManager) {
    redirect("/dashboard");
  }

  if (!companyId) redirect("/auth/login");

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
              Voraus planen und zurückschauen — Klartext aus Schichten und Stempelzeiten, ohne Score-Dashboards.
            </p>
          </div>
        </div>
      </header>

      <DashboardManagerGuidance>
        <DashboardGuidanceSection
          title="Diese Woche planen"
          description="Konkrete Tipps für die kommenden Tage — was du im Schichtplaner einplanen solltest."
        >
          <Suspense fallback={null}>
            <PredictiveStaffingCard />
          </Suspense>
        </DashboardGuidanceSection>

        <DashboardGuidanceSection
          title="Aus deinen Betriebsdaten"
          description="Rückblick und Checks aus Stempeluhr, Plan und ArbZG."
        >
          <Suspense fallback={null}>
            <RevenueSignalCard companyId={companyId} />
          </Suspense>
          <Suspense fallback={null}>
            <PlanVsIstCard companyId={companyId} />
          </Suspense>
          <Suspense fallback={null}>
            <ComplianceCard />
          </Suspense>
          <Suspense fallback={null}>
            <VremaInsightsCard />
          </Suspense>
          <DashboardAISection>
            <Suspense fallback={<AIInsightsSkeleton />}>
              <AsyncAIInsights companyId={companyId} />
            </Suspense>
          </DashboardAISection>
        </DashboardGuidanceSection>
      </DashboardManagerGuidance>

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
  );
}
