import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANUAL_BILLING } from "@/lib/plans";
import { Ban, Mail } from "lucide-react";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";

export default async function AccessSuspendedPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/auth/login");

  const company = await db.company.findUnique({
    where: { id: session.user.companyId },
    select: { name: true, tenantStatus: true },
  });
  if (!company) redirect("/auth/login");

  if (company.tenantStatus === "ACTIVE") redirect("/dashboard");
  if (company.tenantStatus === "PENDING") redirect("/dashboard/access-pending");

  return (
    <DashboardPageShell maxWidth="3xl" className="py-8">
      <div className="mx-auto max-w-lg rounded-2xl border border-danger/30 bg-danger-soft/20 p-8 text-center">
        <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-soft text-danger">
          <Ban className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="text-xl font-bold">Zugang pausiert</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Der Zugang für <strong className="text-foreground">{company.name}</strong> ist vorübergehend gesperrt — z. B.
          bei offener Rechnung. Schreib uns kurz, dann klären wir das.
        </p>
        <a
          href={`mailto:${MANUAL_BILLING.contactEmail}?subject=VREMA%20Zugang%20${encodeURIComponent(company.name)}`}
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-brand-foreground"
        >
          <Mail className="h-4 w-4" aria-hidden />
          Support kontaktieren
        </a>
        <p className="mt-4">
          <Link href="/dashboard/billing" className="text-xs text-brand underline underline-offset-2">
            Abrechnung ansehen
          </Link>
        </p>
      </div>
    </DashboardPageShell>
  );
}
