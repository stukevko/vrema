import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  listSupportTicketsForSuperAdmin,
  replyToSupportTicketFormAction,
} from "@/lib/actions/support";
import { ticketStatusDe, ticketTypeDe } from "@/lib/support/ticket-labels";
import { FormSubmitButton } from "@/components/ui/FormSubmitButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Inbox, LifeBuoy } from "lucide-react";
import { TicketStatus } from "@prisma/client";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

export default async function SuperAdminTicketsPage() {
  const session = await auth();
  const isSuperAdmin =
    session?.user?.role === "SUPER_ADMIN" || session?.user?.id === process.env.SUPER_ADMIN_USER_ID;
  if (!isSuperAdmin) redirect("/dashboard");

  const tickets = await listSupportTicketsForSuperAdmin();

  return (
    <DashboardPageShell maxWidth="6xl">
      <DashboardPageHeader
        variant="card"
        icon={LifeBuoy}
        eyebrow="Super-Admin"
        title="Support-Tickets (System)"
        description="Alle Mandanten. Mit Antwort wird der Status automatisch auf „Beantwortet“ gesetzt (sonst gewählter Status)."
      />

      <div className="space-y-3">
        {tickets.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Keine offenen Tickets"
            description="Sobald Mandanten Hilfe anfragen, erscheinen die Tickets hier."
            tone="celebrate"
          />
        ) : (
          tickets.map((ticket) => (
            <form
              key={ticket.id}
              action={replyToSupportTicketFormAction}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <input type="hidden" name="ticketId" value={ticket.id} />
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">{ticketTypeDe(ticket.type)}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{ticketStatusDe(ticket.status)}</span>
                <span className="text-xs text-muted-foreground">{ticket.org.name}</span>
              </div>
              <p className="mt-2 text-sm font-semibold">{ticket.subject}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{ticket.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Von {ticket.user.name ?? ticket.user.email} · {new Date(ticket.createdAt).toLocaleString("de-DE")}
              </p>
              {ticket.response ? (
                <div className="mt-3 whitespace-pre-wrap rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-[11px] font-medium text-muted-foreground">Aktuelle Antwort: </span>
                  {ticket.response}
                  {ticket.respondedAt ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(ticket.respondedAt).toLocaleString("de-DE")}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-3 grid gap-2 md:grid-cols-[180px_1fr_auto] md:items-end">
                <div>
                  <label className="text-[11px] text-muted-foreground">Status (ohne neue Antwort)</label>
                  <select name="status" defaultValue={ticket.status} className="mt-1 w-full rounded-xl px-3 py-2 text-sm">
                    <option value={TicketStatus.OPEN}>Offen</option>
                    <option value={TicketStatus.PENDING}>In Bearbeitung</option>
                    <option value={TicketStatus.RESOLVED}>Beantwortet</option>
                    <option value={TicketStatus.CLOSED}>Gelöst</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">
                    Antwort an Mitarbeiter (neu geändert → Status „Beantwortet“)
                  </label>
                  <textarea
                    name="response"
                    rows={3}
                    placeholder="Antwort an den Mitarbeiter…"
                    className="mt-1 w-full rounded-xl px-3 py-2 text-sm"
                    defaultValue={ticket.response ?? ""}
                  />
                </div>
                <FormSubmitButton
                  label="Speichern"
                  pendingLabel="Speichere…"
                  className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-foreground disabled:opacity-60"
                />
              </div>
            </form>
          ))
        )}
      </div>
    </DashboardPageShell>
  );
}
