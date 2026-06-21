import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANUAL_BILLING, PLANS } from "@/lib/plans";
import { planDisplayName } from "@/lib/plan-limits";
import { Clock, Mail } from "lucide-react";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";

export default async function AccessPendingPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/auth/login");

  const company = await db.company.findUnique({
    where: { id: session.user.companyId },
    select: { name: true, plan: true, tenantStatus: true },
  });
  if (!company) redirect("/auth/login");

  if (company.tenantStatus === "ACTIVE") redirect("/dashboard");
  if (company.tenantStatus === "SUSPENDED") redirect("/dashboard/access-suspended");

  const plan = PLANS[company.plan];

  return (
    <DashboardPageShell maxWidth="3xl" className="py-8">
      <div className="mx-auto max-w-lg rounded-2xl border border-line bg-surface p-8 text-center shadow-[var(--shadow-card)]">
        <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Clock className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="text-xl font-bold">Dein VREMA-Zugang wird vorbereitet</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Danke, <strong className="text-foreground">{company.name}</strong>! Wir prüfen deine Anfrage und melden uns
          persönlich — meist innerhalb eines Werktags. Danach kannst du sofort stempeln und planen.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Gewünschter Tarif: <strong className="text-foreground">{planDisplayName(company.plan)}</strong> (
          {plan.monthlyPrice} €/Monat, All-In)
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <a
            href={`mailto:${MANUAL_BILLING.contactEmail}?subject=VREMA%20Freischaltung%20${encodeURIComponent(company.name)}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-brand-foreground"
          >
            <Mail className="h-4 w-4" aria-hidden />
            Kontakt aufnehmen
          </a>
          <Link
            href="/dashboard/billing"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line px-5 text-sm font-semibold"
          >
            Tarif ansehen
          </Link>
        </div>
      </div>
    </DashboardPageShell>
  );
}
