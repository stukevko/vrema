import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Timer, CalendarDays } from "lucide-react";

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
          Hallo im Team von {company?.name ?? "deinem Betrieb"}!
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          In drei Schritten bist du startklar — Stempeln dauert unter 10 Sekunden.
        </p>
        <ol className="mt-5 space-y-3 text-sm">
          <li className="flex gap-3 rounded-xl border border-border/60 bg-background/50 px-4 py-3">
            <Timer className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
            <span>
              <strong className="text-foreground">1. Einstempeln</strong> — auf der Übersicht den großen Button
              nutzen oder am Terminal deine PIN eingeben.
            </span>
          </li>
          <li className="flex gap-3 rounded-xl border border-border/60 bg-background/50 px-4 py-3">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
            <span>
              <strong className="text-foreground">2. Schichten ansehen</strong> — im Planer sieh du, wann du
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
    </div>
  );
}
