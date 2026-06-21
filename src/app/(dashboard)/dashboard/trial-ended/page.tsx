import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCompanyTrialState } from "@/lib/trial";
import { flyerReferralDisplayName, isFlyerReferralCode } from "@/lib/trial/referral";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { PLANS } from "@/lib/plans";

export default async function TrialEndedPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/auth/login");

  const trial = await getCompanyTrialState(session.user.companyId);
  if (trial && !trial.isTrialExpired && !trial.isInAppTrial) {
    redirect("/dashboard");
  }
  if (trial?.isInAppTrial) {
    redirect("/dashboard");
  }

  const company = await db.company.findUnique({
    where: { id: session.user.companyId },
    select: { referredBy: true, name: true },
  });

  const flyerLabel =
    company?.referredBy && isFlyerReferralCode(company.referredBy)
      ? flyerReferralDisplayName(company.referredBy)
      : null;

  const isManager =
    session.user.role === "COMPANY_OWNER" ||
    session.user.role === "MANAGER" ||
    session.user.role === "SUPER_ADMIN";

  return (
    <DashboardPageShell maxWidth="2xl" animateEnter className="py-8 sm:py-16">
      <div className="mx-auto max-w-lg text-center">
        <DashboardPageHeader
          variant="plain"
          eyebrow="Testphase"
          title="Die Testphase ist vorbei"
          description={
            isManager
              ? flyerLabel
                ? `Dein ${flyerLabel}-Zugang ist ausgelaufen. Wähle einen Tarif, damit dein Team weiter stempeln und planen kann.`
                : "Wähle einen Tarif, damit dein Team weiter stempeln und planen kann."
              : "Dein Betrieb muss einen Tarif wählen. Sprich mit der Geschäftsführung oder der Führung."
          }
        />

        {isManager ? (
          <>
            <div className="mt-6 rounded-2xl border border-line bg-surface-muted/80 px-4 py-4 text-left text-sm dark:border-white/10">
              <p className="font-semibold text-foreground">Was passiert jetzt?</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                <li>Stempeln und Planung sind für das Team pausiert</li>
                <li>Berichte und Einstellungen bleiben für dich erreichbar</li>
                <li>Nach dem Tarif: sofort wieder voll nutzbar — keine Neu-Einrichtung</li>
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Ab {PLANS.PETITE.monthlyPrice} €/Monat (Petite, All-In) · monatlich per Rechnung, monatlich kündbar
              </p>
            </div>
            <Link
              href="/dashboard/billing?trial_expired=1"
              className="btn-primary-solid mt-8 inline-flex min-h-12 w-full items-center justify-center px-6 text-sm font-semibold sm:w-auto"
            >
              Tarif wählen
            </Link>
          </>
        ) : (
          <Link
            href="/dashboard/account"
            className="btn-secondary-outline mt-8 inline-flex min-h-12 items-center justify-center px-6 text-sm"
          >
            Zu meinem Konto
          </Link>
        )}
      </div>
    </DashboardPageShell>
  );
}
