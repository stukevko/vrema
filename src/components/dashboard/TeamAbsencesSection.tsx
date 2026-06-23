import { decideAbsence } from "@/lib/actions/absence";
import { db } from "@/lib/db";
import { CalendarX2 } from "lucide-react";
import { FormSubmitButton } from "@/components/ui/FormSubmitButton";
import { EmptyState } from "@/components/ui/EmptyState";

export async function TeamAbsencesSection({ companyId }: { companyId: string }) {
  // Nur offene Meldungen laden – historische APPROVED/REJECTED werden hier nicht gerendert.
  const pending = await db.absence.findMany({
    where: { orgId: companyId, status: "REQUESTED" },
    include: {
      user: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return (
    <section id="abwesenheiten" className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Freigaben · Abwesenheiten</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Urlaubs- und Krankmeldungen aus dem Team — sonstige Abwesenheiten findest du weiter unten.
        </p>
      </div>

      {pending.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title="Keine offenen Abwesenheiten"
          description="Neue Meldungen erscheinen hier zur Freigabe."
          tone="celebrate"
        />
      ) : (
        <ul className="space-y-3">
          {pending.map((item) => (
            <li key={item.id}>
              <form
                action={async (formData) => {
                  "use server";
                  await decideAbsence({
                    absenceId: item.id,
                    status: String(formData.get("status") ?? "REQUESTED") as
                      | "REQUESTED"
                      | "APPROVED"
                      | "REJECTED",
                  });
                }}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{item.type}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{item.status}</span>
                </div>
                <p className="mt-2 text-sm font-semibold">{item.user.name ?? item.user.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(item.start).toLocaleDateString("de-DE")} –{" "}
                  {new Date(item.end).toLocaleDateString("de-DE")}
                </p>
                {item.reason ? <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p> : null}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <FormSubmitButton
                    name="status"
                    value="APPROVED"
                    label="Genehmigen"
                    pendingLabel="Speichere..."
                    className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary disabled:opacity-60 sm:w-auto"
                  />
                  <FormSubmitButton
                    name="status"
                    value="REJECTED"
                    label="Ablehnen"
                    pendingLabel="Speichere..."
                    className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-60 sm:w-auto"
                  />
                </div>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
