import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PLANS, MANUAL_BILLING } from "@/lib/plans";
import { planDisplayName } from "@/lib/plan-limits";
import { tenantDisplayStatus } from "@/lib/tenant-access";
import { getCompanyTrialState } from "@/lib/trial";
import { TRIAL_DAYS } from "@/lib/trial/constants";
import { Check, Mail, Clock, Sparkles } from "lucide-react";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/auth/login");

  const role = session.user.role ?? "EMPLOYEE";
  if (role === "EMPLOYEE") redirect("/dashboard");

  const company = await db.company.findUnique({
    where: { id: session.user.companyId },
    select: {
      plan: true,
      tenantStatus: true,
      billingExempt: true,
      name: true,
      trialEndsAt: true,
    },
  });
  if (!company) redirect("/auth/login");

  const trial = await getCompanyTrialState(session.user.companyId);
  const planConfig = PLANS[company.plan];
  const isSuspended = company.tenantStatus === "SUSPENDED";
  const inTrial = trial?.isInAppTrial ?? false;
  const trialExpired = trial?.isTrialExpired ?? false;

  return (
    <DashboardPageShell maxWidth="3xl" animateEnter className="sm:space-y-8">
      <DashboardPageHeader
        variant="hero"
        eyebrow="Abonnement"
        title="Tarif & Abrechnung"
        description="Flatrate per Rechnung — kein Kreditkarten-Zwang."
      />

      {inTrial && (
        <div className="rounded-xl border border-brand/25 bg-brand-soft/50 px-4 py-4 dark:border-white/10 dark:bg-brand/10">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
            <div>
              <p className="text-sm font-semibold">Testphase läuft — noch {trial?.daysRemaining} Tage</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Du testest VREMA kostenlos ({TRIAL_DAYS} Tage). Danach kurz Zugang anfragen — wir schalten frei und
                schicken die Rechnung per E-Mail.
              </p>
            </div>
          </div>
        </div>
      )}

      {trialExpired && (
        <div className="rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-4 dark:border-amber-500/30 dark:bg-amber-950/40">
          <div className="flex gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">Testphase vorbei</p>
              <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/90">
                Schreib uns kurz — wir schalten {company.name} frei und senden die Rechnung.
              </p>
            </div>
          </div>
        </div>
      )}

      {!inTrial && !trialExpired && company.tenantStatus === "PENDING" && (
        <div className="rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-4 dark:border-amber-500/30 dark:bg-amber-950/40">
          <div className="flex gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">Freischaltung ausstehend</p>
              <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/90">
                Wir melden uns in Kürze bei dir und schalten {company.name} frei.
              </p>
            </div>
          </div>
        </div>
      )}

      {isSuspended && (
        <div className="rounded-xl border border-danger/40 bg-danger-soft/40 px-4 py-4">
          <p className="text-sm font-semibold text-danger-foreground">Zugang pausiert</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Bitte offene Rechnung begleichen oder uns kurz schreiben — dann schalten wir wieder frei.
          </p>
        </div>
      )}

      <div className="rounded-2xl glass-panel p-6 sm:p-8">
        <p className="text-xs text-muted-foreground mb-1">Dein Tarif</p>
        <p className="text-2xl font-bold">{planDisplayName(company.plan)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Status: {tenantDisplayStatus(company)}
          {company.billingExempt ? " · Kostenfrei freigeschaltet" : ""}
        </p>
        <p className="mt-3 text-3xl font-bold">
          {planConfig.monthlyPrice}€
          <span className="text-sm font-normal text-muted-foreground"> / Monat (Flatrate)</span>
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-sm font-bold">All-In — alles drin</h2>
        <ul className="mt-4 space-y-2">
          {planConfig.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-3.5 w-3.5 shrink-0 text-[#22c55e]" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-brand/25 bg-brand-soft/50 px-5 py-4 dark:border-white/10 dark:bg-brand/10">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Mail className="h-4 w-4 text-brand" aria-hidden />
          Manuelle Abrechnung
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{MANUAL_BILLING.paymentNote}</p>
        <a
          href={`mailto:${MANUAL_BILLING.contactEmail}?subject=VREMA%20Abrechnung%20${encodeURIComponent(company.name)}`}
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-brand px-4 text-sm font-bold text-brand-foreground"
        >
          {MANUAL_BILLING.contactEmail}
        </a>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Tarif wechseln (Petite ↔ Major)?{" "}
        <Link href={`mailto:${MANUAL_BILLING.contactEmail}`} className="text-brand underline underline-offset-2">
          Schreib uns kurz
        </Link>
        .
      </p>
    </DashboardPageShell>
  );
}
