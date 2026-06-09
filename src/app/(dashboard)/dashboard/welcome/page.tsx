import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Timer, CalendarDays } from "lucide-react";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

export default async function DashboardWelcomePage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/auth/login");

  const company = await db.company.findUnique({
    where: { id: session.user.companyId },
    select: { name: true },
  });

  return (
    <DashboardPageShell maxWidth="3xl">
      <DashboardPageHeader
        variant="hero"
        eyebrow="Willkommen"
        title={`Hallo im Team von ${company?.name ?? "deinem Betrieb"}!`}
        description="Ein Klick stempeln — Planung und Team inklusive. Kein Aufschreiben, kein Formular-Chaos."
      />
      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3 rounded-xl border border-border/60 bg-background/50 px-4 py-3">
            <Timer className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
            <span>
              <strong className="text-foreground">1. Einstempeln</strong> — ein Klick auf den großen Button
              (oder PIN am Terminal). Nicht aufschreiben — tippen.
            </span>
          </li>
          <li className="flex gap-3 rounded-xl border border-border/60 bg-background/50 px-4 py-3">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
            <span>
              <strong className="text-foreground">2. Schichten ansehen</strong> — im Planer siehst du, wann du
              eingeplant bist.
            </span>
          </li>
          <li className="flex gap-3 rounded-xl border border-border/60 bg-background/50 px-4 py-3">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-xs font-bold text-brand">
              3
            </span>
            <span>
              <strong className="text-foreground">3. Verfügbarkeit</strong> — unter Mein Konto Tage markieren, an
              denen du normalerweise nicht kannst.
            </span>
          </li>
        </ol>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard#terminal-widget"
            className="btn-primary-solid inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold"
          >
            Jetzt einstempeln
          </Link>
          <Link
            href="/dashboard/account"
            className="btn-secondary-outline inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold"
          >
            Mein Konto
          </Link>
        </div>
      </section>
    </DashboardPageShell>
  );
}
