import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/stripe";
import { createCheckoutSession, createBillingPortalSession } from "@/lib/actions/billing";
import { Check, Zap, CreditCard } from "lucide-react";
import Link from "next/link";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/auth/login");

  const params = await searchParams;
  const { companyId } = session.user as { companyId: string };
  const role = session.user.role ?? "EMPLOYEE";
  if (role === "EMPLOYEE") redirect("/dashboard");

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { plan: true, billingInterval: true, stripeCustomerId: true, subEndsAt: true },
  });

  if (!company) redirect("/auth/login");

  const currentPlan = company.plan;

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-foreground premium-enter">
      <div className="rounded-3xl glass-panel p-8">
        <h1 className="text-3xl font-bold tracking-tight">Abonnement & Billing</h1>
        <p className="text-muted-foreground text-sm mt-1">Verwalte dein Abo und deine Zahlungsmethoden.</p>
      </div>

      {params.success && (
        <div className="rounded-xl bg-primary/10 border border-primary/30 p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-[#22c55e]" />
          <p className="text-sm text-[#22c55e] font-medium">Zahlung erfolgreich! Dein Plan wurde aktualisiert.</p>
        </div>
      )}

      {/* Current plan */}
      <div className="rounded-3xl glass-panel p-8">
        <div className="flex items-center justify-between">
          <div>
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
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-border text-sm font-medium transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Zahlungsportal
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {(Object.entries(PLANS) as [keyof typeof PLANS, (typeof PLANS)[keyof typeof PLANS]][]).map(([key, plan]) => {
          const isCurrent = currentPlan === key;
          return (
            <div
              key={key}
              className={`rounded-3xl p-8 border backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 ${
                isCurrent
                  ? "bg-primary/5 border-primary/30"
                  : "bg-card border-border"
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
                  className="mb-1 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-black ring-1 ring-inset ring-white/20 hover:bg-primary/90 transition-colors"
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
                {plan.features.slice(0, 4).map((f) => (
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
                      className="w-full py-2.5 rounded-xl bg-primary text-black text-sm font-bold ring-1 ring-inset ring-white/20 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      Monatlich upgraden
                    </button>
                  </form>
                  <form action={createCheckoutSession.bind(null, key as "STARTER" | "BUSINESS", "yearly")}>
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-white border border-border text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                      Jährlich (2 Monate gratis)
                    </button>
                  </form>
                </div>
              )}
              {key === "ENTERPRISE" && !isCurrent && (
                <a
                  href="mailto:kontakt@kevko.studio?subject=Enterprise%20Anfrage%20Vrema"
                  className="block w-full py-2.5 rounded-xl bg-white border border-border text-sm font-medium text-center hover:bg-slate-50 transition-colors"
                >
                  Kontakt aufnehmen
                </a>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-white px-4 py-3 text-xs text-muted-foreground">
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
