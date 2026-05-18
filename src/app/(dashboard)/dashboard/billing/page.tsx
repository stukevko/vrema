import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/stripe";
import { createCheckoutSession, createBillingPortalSession } from "@/lib/actions/billing";
import { Check, Zap, CreditCard, Clock } from "lucide-react";
import Link from "next/link";
import { getCompanyTrialState, TRIAL_DAYS, TRIAL_MAX_EMPLOYEES } from "@/lib/trial";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string; trial_expired?: string; upgrade?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/auth/login");

  const params = await searchParams;
  const { companyId } = session.user as { companyId: string };
  const role = session.user.role ?? "EMPLOYEE";
  if (role === "EMPLOYEE") redirect("/dashboard");

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: {
      plan: true,
      billingInterval: true,
      stripeCustomerId: true,
      stripeSubId: true,
      subEndsAt: true,
      trialEndsAt: true,
    },
  });

  if (!company) redirect("/auth/login");

  const trial = await getCompanyTrialState(companyId);
  const currentPlan = company.plan;
  const showTrialExpired = params.trial_expired === "1" || trial?.isTrialExpired;
  const highlightBusiness = params.upgrade === "business";

  return (
    <div className="premium-enter mx-auto max-w-5xl space-y-6 px-1 text-foreground sm:space-y-8 sm:px-0">
      <div className="rounded-2xl glass-panel p-5 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Abonnement</h1>
        <p className="text-muted-foreground text-sm mt-1">Tarif wählen und Zahlungsmethoden verwalten.</p>
      </div>

      {showTrialExpired && !trial?.hasPaidSubscription && (
        <div className="rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-4 dark:border-amber-500/30 dark:bg-amber-950/40">
          <div className="flex gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">Testphase beendet</p>
              <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/90">
                Dein Team kann nicht weiter stempeln oder planen, bis du einen Tarif abschließt. Keine zweite Testphase
                — einmal {TRIAL_DAYS} Tage mit bis zu {TRIAL_MAX_EMPLOYEES} Mitarbeitenden.
              </p>
            </div>
          </div>
        </div>
      )}

      {highlightBusiness && !trial?.hasPaidSubscription && (
        <div className="rounded-xl border border-brand/30 bg-brand-soft/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-brand/15">
          <p className="font-semibold text-foreground">Business — für Lohnbüro & Exporte</p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF-Monatsberichte, Versand ans Lohnbüro und DATEV-CSV — der nächste Schritt nach der Testphase.
          </p>
        </div>
      )}

      {trial?.isInAppTrial && (
        <div className="rounded-xl border border-brand/25 bg-brand-soft/60 px-4 py-3 text-sm dark:border-white/10 dark:bg-brand/15">
          <p className="font-medium text-foreground">
            Testphase läuft — noch {trial.daysRemaining} {trial.daysRemaining === 1 ? "Tag" : "Tage"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Bis zu {TRIAL_MAX_EMPLOYEES} Mitarbeitende in der Testphase. Wähle rechtzeitig einen Tarif, damit nichts
            unterbrochen wird.
          </p>
        </div>
      )}

      {params.success && (
        <div className="rounded-xl bg-primary/10 border border-primary/30 p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-[#22c55e]" />
          <p className="text-sm text-[#22c55e] font-medium">Zahlung erfolgreich. Dein Plan wurde aktualisiert.</p>
        </div>
      )}

      {/* Current plan */}
      <div className="rounded-2xl glass-panel p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Aktueller Plan</p>
            <p className="text-2xl font-bold capitalize">{currentPlan}</p>
            {company.subEndsAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Läuft bis: {new Date(company.subEndsAt).toLocaleDateString("de-DE")}
              </p>
            )}
          </div>
          {company.stripeCustomerId && (
            <form action={createBillingPortalSession}>
              <button
                type="submit"
              className="flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium transition-colors hover:bg-surface-muted hover:border-brand/40 sm:min-h-0 sm:py-2"
              >
                <CreditCard className="w-4 h-4" />
                Zahlungsportal
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(Object.entries(PLANS) as [keyof typeof PLANS, (typeof PLANS)[keyof typeof PLANS]][]).map(([key, plan]) => {
          const isCurrent = currentPlan === key;
          return (
            <div
              key={key}
              className={`rounded-2xl border p-8 shadow-[var(--shadow-card)] transition-[box-shadow,border-color] duration-200 hover:shadow-[var(--shadow-card-hover)] ${
                isCurrent
                  ? "border-brand/30 bg-brand-soft/40 dark:bg-brand/15"
                  : "border-line bg-surface dark:bg-surface/85"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">{plan.name}</h3>
                {isCurrent && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-semibold">
                    Aktiv
                  </span>
                )}
              </div>

              {isCurrent ? (
                <a
                  href="/dashboard"
                  className="mb-1 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-foreground ring-1 ring-inset ring-white/20 transition-colors hover:bg-primary/90 sm:min-h-0"
                >
                  Zum Dashboard gehen
                </a>
              ) : (
                <p className="text-2xl md:text-3xl font-bold mb-1">
                  {plan.monthlyPrice === null ? "Auf Anfrage" : `${plan.monthlyPrice}€`}
                  {plan.monthlyPrice !== null && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                </p>
              )}

              <ul className="mt-4 mb-6 space-y-2">
                {plan.features.slice(0, 6).map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-foreground">
                    <Check className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {!isCurrent && key !== "ENTERPRISE" && (
                <div className="flex flex-col gap-2">
                  <form action={createCheckoutSession.bind(null, key as "STARTER" | "BUSINESS", "monthly")}>
                    <button
                      type="submit"
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-foreground ring-1 ring-inset ring-white/20 transition-colors hover:bg-primary/90 sm:min-h-0 sm:py-2.5"
                    >
                      <Zap className="w-4 h-4" />
                      Monatlich upgraden
                    </button>
                  </form>
                  <form action={createCheckoutSession.bind(null, key as "STARTER" | "BUSINESS", "yearly")}>
                    <button
                      type="submit"
                      className="min-h-12 w-full rounded-xl border border-line bg-surface py-3.5 text-sm font-medium transition-colors hover:bg-surface-muted hover:border-brand/40 sm:min-h-0 sm:py-2.5"
                    >
                      Jährlich (2 Monate gratis)
                    </button>
                  </form>
                </div>
              )}
              {key === "ENTERPRISE" && !isCurrent && (
                <a
                  href="mailto:kontakt@kevko.studio?subject=Enterprise%20Anfrage%20Vrema"
                  className="block min-h-12 w-full rounded-xl border border-line bg-surface py-3.5 text-center text-sm font-medium transition-colors hover:bg-surface-muted hover:border-brand/40 sm:min-h-0 sm:py-2.5"
                >
                  Kontakt aufnehmen
                </a>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-line bg-surface px-4 py-3 text-xs text-muted-foreground">
        Mit dem Abschluss eines kostenpflichtigen Plans gelten die{" "}
        <Link href="/agb" className="text-foreground underline underline-offset-2 hover:text-foreground">
          AGB
        </Link>{" "}
        , die{" "}
        <Link href="/datenschutz" className="text-foreground underline underline-offset-2 hover:text-foreground">
          Datenschutzhinweise
        </Link>{" "}
        und bei Bedarf die{" "}
        <Link href="/avv" className="text-foreground underline underline-offset-2 hover:text-foreground">
          AVV
        </Link>
        .
      </div>
    </div>
  );
}
