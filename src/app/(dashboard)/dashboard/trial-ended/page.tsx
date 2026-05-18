import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCompanyTrialState } from "@/lib/trial";

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
    <div className="premium-enter mx-auto max-w-lg px-1 py-8 text-center sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand">Testphase</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Die Testphase ist vorbei</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        {isManager
          ? "Wähle einen Tarif, damit dein Team weiter stempeln und planen kann."
          : "Dein Betrieb muss einen Tarif wählen. Sprich mit der Geschäftsführung oder dem Schichtleiter."}
      </p>
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
    </div>
  );
}
