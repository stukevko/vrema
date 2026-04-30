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
    <div className="min-h-screen bg-background text-white px-4 py-10">
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-white/5 bg-[#141414] p-6 md:p-8">
        <p className="mb-2 text-xs font-sans uppercase tracking-widest text-primary">Onboarding</p>
        <h1 className="text-2xl font-bold">Kurz einrichten, dann geht es los</h1>
        <p className="mt-2 text-sm text-white/50">
          Wir bringen dich direkt ins Dashboard. Billing bleibt als optionaler Menupunkt bestehen.
        </p>

        {requireCard && (
          <div className="mt-5 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-xs text-amber-200">
            Echtheits-Check aktiv: Vor Dashboard-Zugang muss eine gültige Karte hinterlegt werden.
          </div>
        )}

        {paymentState === "cancel" && (
          <p className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">
            Kartenprüfung abgebrochen. Bitte erneut starten.
          </p>
        )}

        {paymentState === "error" && (
          <p className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">
            Stripe-Setup konnte nicht gestartet werden. Bitte ENV/Stripe-Konfiguration prüfen.
          </p>
        )}

        {requireCard && !company?.paymentMethodVerifiedAt && (
          <form action={createCardSetupSession} className="mt-4">
            <button
              type="submit"
              className="w-full rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/15 px-4 py-3 text-sm font-bold text-[#86efac] hover:bg-[#22c55e]/20"
            >
              Karte hinterlegen (0,00 EUR Verifikation)
            </button>
          </form>
        )}

        {requireCard && company?.paymentMethodVerifiedAt && (
          <p className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-xs text-emerald-300">
            Karte verifiziert. Du kannst das Setup abschliessen.
          </p>
        )}

        <form action={finishSetup} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-white/50">Wie heisst deine Firma?</label>
            <input
              name="companyName"
              type="text"
              required
              defaultValue={company?.name ?? ""}
              placeholder="Musterfirma GmbH"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-primary/50 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-white/50">Wie viele Mitarbeiter habt ihr?</label>
            <input
              name="employeeCount"
              type="number"
              min={1}
              step={1}
              placeholder="z. B. 8"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-primary/50 focus:outline-none transition-colors"
            />
            <p className="mt-1 text-[11px] text-white/30">Diese Angabe hilft bei der Einordnung deines Setups.</p>
          </div>

          <button
            type="submit"
            disabled={requireCard && !company?.paymentMethodVerifiedAt}
            className="w-full rounded-xl bg-[#22c55e] px-4 py-3 text-sm font-bold text-black transition-colors hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Weiter zum Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
