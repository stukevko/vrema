import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { decideAbsence } from "@/lib/actions/absence";
import { db } from "@/lib/db";

export default async function TeamAbsencesPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  const role = session.user.role ?? "EMPLOYEE";
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    redirect("/dashboard");
  }

  const absences = await db.absence.findMany({
    where: { orgId: session.user.companyId },
    include: {
      user: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-1 sm:px-0">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
        <h1 className="text-2xl font-bold">Team-Abwesenheiten</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Zentrale Freigabe fuer Urlaub, Krankmeldungen und sonstige Abwesenheiten.
        </p>
      </div>

      <div className="space-y-3">
        {absences.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Keine Abwesenheiten vorhanden.</div>
        ) : (
          absences.map((item) => (
            <form
              key={item.id}
              action={async (formData) => {
                "use server";
                await decideAbsence({
                  absenceId: item.id,
                  status: String(formData.get("status") ?? "REQUESTED") as "REQUESTED" | "APPROVED" | "REJECTED",
                });
              }}
              className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{item.type}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{item.status}</span>
              </div>
              <p className="mt-2 text-sm font-semibold">{item.user.name ?? item.user.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(item.start).toLocaleDateString("de-DE")} - {new Date(item.end).toLocaleDateString("de-DE")}
              </p>
              {item.reason ? <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p> : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  name="status"
                  value="APPROVED"
                  className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary"
                >
                  Genehmigen
                </button>
                <button
                  type="submit"
                  name="status"
                  value="REJECTED"
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                >
                  Ablehnen
                </button>
                <button
                  type="submit"
                  name="status"
                  value="REQUESTED"
                  className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground"
                >
                  Offen lassen
                </button>
              </div>
            </form>
          ))
        )}
      </div>
    </div>
  );
}
