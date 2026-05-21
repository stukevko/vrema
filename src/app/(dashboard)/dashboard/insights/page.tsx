import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Brain, TrendingUp } from "lucide-react";
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
import { getCompanyModulesForTenant } from "@/lib/actions/company-modules";

export const metadata = {
  title: "Auswertung",
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

  const modules = await getCompanyModulesForTenant();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-1 sm:px-0">
      <header className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Brain className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Auswertung</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Rückblick und Hinweise aus Stempelzeiten und Schichtplan — klar und ohne Score-Dashboards.
            </p>
          </div>
        </div>
      </header>

      {!modules.peaks ? (
        <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Stoßzeiten-Modul ist aus</p>
          <p className="mt-1">
            Personal-Tipps mit Umsatzbezug fehlen deshalb hier. Aktiviere{" "}
            <strong className="text-foreground">Stoßzeiten & Umsatz</strong> unter{" "}
            <Link href="/dashboard/settings#company-modules" className="font-semibold text-brand underline-offset-2">
              Einstellungen → Module
            </Link>
            .
          </p>
        </div>
      ) : null}

      {modules.peaks ? (
        <Link
          href="/dashboard/peaks"
          className="flex items-center justify-between gap-3 rounded-2xl border border-brand/25 bg-brand/5 px-4 py-3 text-sm transition-colors hover:bg-brand/10"
        >
          <span className="flex items-center gap-2 font-medium text-foreground">
            <TrendingUp className="h-4 w-4 text-brand" aria-hidden />
            Stoßzeiten & Umsatz pflegen
          </span>
          <span className="text-xs text-muted-foreground">Ruhig · Normal · Stoß pro Tag</span>
        </Link>
      ) : null}

      <DashboardManagerGuidance>
        {modules.peaks ? (
          <DashboardGuidanceSection
            title="Diese Woche planen"
            description="Konkrete Tipps für die kommenden Tage — was du im Schichtplaner einplanen solltest."
          >
            <Suspense fallback={null}>
              <PredictiveStaffingCard />
            </Suspense>
          </DashboardGuidanceSection>
        ) : null}

        <DashboardGuidanceSection
          title="Aus deinen Betriebsdaten"
          description="Rückblick und Checks aus Stempeluhr, Plan und ArbZG."
        >
          {modules.peaks ? (
            <Suspense fallback={null}>
              <RevenueSignalCard companyId={companyId} />
            </Suspense>
          ) : null}
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
