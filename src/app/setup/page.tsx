import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

async function finishSetup(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const companyName = String(formData.get("companyName") ?? "").trim();

  if (session.user.companyId && companyName.length > 0) {
    await db.company.update({
      where: { id: session.user.companyId },
      data: { name: companyName },
    });
  }

  redirect("/dashboard/access-pending");
}

export default async function SetupPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const company = session.user.companyId
    ? await db.company.findUnique({
        where: { id: session.user.companyId },
        select: { name: true, tenantStatus: true },
      })
    : null;

  if (company?.tenantStatus === "ACTIVE") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)] dark:border-white/10 dark:bg-surface/90 md:p-8">
        <p className="mb-2 text-xs font-sans uppercase tracking-widest text-primary">Onboarding</p>
        <h1 className="text-2xl font-bold">Fast geschafft</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Firmennamen bestätigen — danach melden wir uns zur Freischaltung.
        </p>

        <form action={finishSetup} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">Wie lautet der Name deiner Firma?</label>
            <input
              name="companyName"
              type="text"
              required
              defaultValue={company?.name ?? ""}
              placeholder="Musterfirma GmbH"
              className="w-full rounded-xl px-4 py-3 text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-foreground ring-1 ring-inset ring-white/20 transition-colors hover:bg-primary/90"
          >
            Weiter
          </button>
        </form>
      </div>
    </div>
  );
}
