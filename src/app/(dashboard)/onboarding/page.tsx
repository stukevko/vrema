import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { getCompanySettings } from "@/lib/actions/settings";

/**
 *  /onboarding – Smart-Wizard direkt nach der Firmen-Registrierung.
 *
 *  Nur für Owner. Mitarbeitende sehen nie diese Seite (Redirect ins Dashboard).
 *  Wenn der Owner essentielle Felder bereits ausgefüllt hat (locationZip ODER
 *  estimatedWeeklyRevenue > 0), nehmen wir an: Onboarding ist gelaufen → Redirect.
 *  So braucht es kein eigenes DB-Feld.
 */
export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  if (session.user.role !== "COMPANY_OWNER" && session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const company = await getCompanySettings();
  const alreadyOnboarded =
    Boolean(company?.locationZip || company?.locationCity) &&
    Boolean(company?.estimatedWeeklyRevenue && company.estimatedWeeklyRevenue > 0);

  if (alreadyOnboarded) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <OnboardingWizard
        companyName={company?.name ?? "Deine Firma"}
        initial={{
          locationZip: company?.locationZip ?? "",
          locationCity: company?.locationCity ?? "",
          estimatedWeeklyRevenue: company?.estimatedWeeklyRevenue ?? null,
          shiftCycleWeeks: company?.shiftCycleWeeks ?? 1,
        }}
      />
    </div>
  );
}
