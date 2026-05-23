import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCompanyTrialState } from "@/lib/trial";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

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

  const isManager =
    session.user.role === "COMPANY_OWNER" ||
    session.user.role === "MANAGER" ||
    session.user.role === "SUPER_ADMIN";

  return (
    <DashboardPageShell maxWidth="2xl" animateEnter className="py-8 text-center sm:py-16">
      <DashboardPageHeader
        variant="plain"
        eyebrow="Testphase"
        title="Die Testphase ist vorbei"
        description={
          isManager
            ? "Wähle einen Tarif, damit dein Team weiter stempeln und planen kann."
            : "Dein Betrieb muss einen Tarif wählen. Sprich mit der Geschäftsführung oder dem Schichtleiter."
        }
        className="mx-auto max-w-lg"
      />
      {isManager ? (
        <Link
          href="/dashboard/billing?trial_expired=1"
          className="btn-primary-solid mt-8 inline-flex min-h-12 items-center justify-center px-6 text-sm font-semibold"
        >
          Tarif wählen
        </Link>
      ) : (
        <Link
          href="/dashboard/account"
          className="btn-secondary-outline mt-8 inline-flex min-h-12 items-center justify-center px-6 text-sm"
        >
          Zu meinem Konto
        </Link>
      )}
    </DashboardPageShell>
  );
}
