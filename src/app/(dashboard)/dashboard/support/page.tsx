import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listMySupportTickets, markMySupportRepliesSeen } from "@/lib/actions/support";
import { ticketStatusDe, ticketTypeDe } from "@/lib/support/ticket-labels";
import { SupportTicketCreateForm } from "@/components/dashboard/SupportTicketCreateForm";
import { LifeBuoy } from "lucide-react";

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  await markMySupportRepliesSeen();

  const tickets = await listMySupportTickets();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-1 sm:px-0">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <LifeBuoy className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Hilfe & Support</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Deine Tickets, Status und neue Anfragen – alles an einem Ort (UTF-8, inkl. ä, ö, ü, ß).
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Meine Tickets</h2>
          {tickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Noch keine Tickets. Nutze das Formular, um uns zu schreiben.
            </div>
          ) : (
            <ul className="space-y-3">
              {tickets.map((t) => (
                <li key={t.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">{ticketTypeDe(t.type)}</span>
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {ticketStatusDe(t.status)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(t.createdAt).toLocaleString("de-DE")}
                    </span>
                  </div>
                  <p className="mt-2 font-semibold text-foreground">{t.subject}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{t.message}</p>
                  {t.response && t.respondedAt ? (
                    <div className="mt-3 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Antwort vom Support</p>
                      <p className="mt-1 whitespace-pre-wrap text-foreground">{t.response}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {new Date(t.respondedAt).toLocaleString("de-DE")}
                      </p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <SupportTicketCreateForm />
      </div>
    </div>
  );
}
