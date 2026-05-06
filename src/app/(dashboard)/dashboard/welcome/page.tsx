import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export default async function DashboardWelcomePage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/auth/login");

  const company = await db.company.findUnique({
    where: { id: session.user.companyId },
    select: { name: true },
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-2 sm:px-0">
      <section className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">Willkommen</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Willkommen im Team von {company?.name ?? "Ihrem Unternehmen"}!
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Deine Arbeitszeiterfassung ist jetzt bereit. Du kannst direkt mit dem Einstempeln starten.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="btn-primary-solid inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold"
          >
            Zum Dashboard
          </Link>
          <Link
            href="/dashboard/team"
            className="btn-secondary-outline inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold"
          >
            Team anzeigen
          </Link>
        </div>
      </section>
    </div>
  );
}
