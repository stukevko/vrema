import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { createCardSetupSession } from "@/lib/actions/billing";

async function finishSetup(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const companyName = String(formData.get("companyName") ?? "").trim();
  const requireCard = process.env.REQUIRE_CARD_ON_SIGNUP === "true";

  if (session.user.companyId && companyName.length > 0) {
    if (requireCard) {
      const companyForPayment = await db.company.findUnique({
        where: { id: session.user.companyId },
        select: { paymentMethodVerifiedAt: true },
      });
      if (!companyForPayment?.paymentMethodVerifiedAt) {
        redirect("/setup?payment=required");
      }
    }

    await db.company.update({
      where: { id: session.user.companyId },
      data: { name: companyName },
    });
  }

  redirect("/dashboard");
}

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const company = session.user.companyId
    ? await db.company.findUnique({
        where: { id: session.user.companyId },
        select: { name: true, paymentMethodVerifiedAt: true },
      })
    : null;
  const requireCard = process.env.REQUIRE_CARD_ON_SIGNUP === "true";
  const params = await searchParams;
  const paymentState = (params.payment as "required" | "ok" | "cancel" | "error" | undefined) ?? null;

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)] dark:border-white/10 dark:bg-surface/90 md:p-8">
        <p className="mb-2 text-xs font-sans uppercase tracking-widest text-primary">Onboarding</p>
        <h1 className="text-2xl font-bold">Kurz einrichten, dann geht es los</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Wir bringen dich direkt ins Dashboard. Billing bleibt als optionaler Menupunkt bestehen.
        </p>

        {requireCard && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
            Echtheits-Check aktiv: Vor Dashboard-Zugang muss eine gültige Karte hinterlegt werden.
          </div>
        )}

        {paymentState === "cancel" && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            Kartenprüfung abgebrochen. Bitte erneut starten.
          </p>
        )}

        {paymentState === "error" && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            Stripe-Setup konnte nicht gestartet werden. Bitte ENV/Stripe-Konfiguration prüfen.
          </p>
        )}

        {requireCard && !company?.paymentMethodVerifiedAt && (
          <form action={createCardSetupSession} className="mt-4">
            <button
              type="submit"
              className="w-full rounded-xl border border-primary/30 bg-primary/15 px-4 py-3 text-sm font-bold text-primary hover:bg-primary/20"
            >
              Karte hinterlegen (0,00 EUR Verifikation)
            </button>
          </form>
        )}

        {requireCard && company?.paymentMethodVerifiedAt && (
          <p className="mt-4 rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-xs text-brand dark:border-white/10 dark:bg-brand/22 dark:text-brand-foreground">
            Karte verifiziert. Sie können das Setup abschliessen.
          </p>
        )}

        <form action={finishSetup} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">Wie lautet der Name Ihrer Firma?</label>
            <input
              name="companyName"
              type="text"
              required
              defaultValue={company?.name ?? ""}
              placeholder="Musterfirma GmbH"
              className="w-full rounded-xl px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">Wie viele Mitarbeitende planen Sie?</label>
            <input
              name="employeeCount"
              type="number"
              min={1}
              step={1}
              placeholder="z. B. 8"
              className="w-full rounded-xl px-4 py-3 text-sm"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Diese Angabe hilft bei der Einordnung Ihres Setups.</p>
          </div>

          <button
            type="submit"
            disabled={requireCard && !company?.paymentMethodVerifiedAt}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-foreground ring-1 ring-inset ring-white/20 transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Weiter zum Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
