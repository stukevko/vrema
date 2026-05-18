import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  listOrgSupportTicketsForManagers,
  replyToOrgSupportTicketFormAction,
} from "@/lib/actions/support";
import { ticketStatusDe, ticketTypeDe } from "@/lib/support/ticket-labels";
import { FormSubmitButton } from "@/components/ui/FormSubmitButton";
import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";
import { TicketStatus } from "@prisma/client";

export default async function OrgAdminSupportPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/auth/login");
  const role = session.user.role ?? "EMPLOYEE";
  if (role === "SUPER_ADMIN") {
    redirect("/dashboard/super-admin/tickets");
  }
  if (!["COMPANY_OWNER", "MANAGER"].includes(role)) {
    redirect("/dashboard/support");
  }

  const tickets = await listOrgSupportTicketsForManagers();

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-1 sm:px-0">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-bold">Support – Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tickets deiner Organisation bearbeiten. Mit Antwort wird der Status automatisch auf „Beantwortet“ gesetzt.
        </p>
      </div>

      <div className="space-y-3">
        {tickets.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Keine Team-Tickets"
            description="Sobald Mitarbeitende unter Hilfe & Support schreiben, landen die Anfragen hier."
            action={
              <Link href="/dashboard/support" className="btn-brand inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-semibold">
                Support-Übersicht
              </Link>
            }
          />
        ) : (
          tickets.map((ticket) => (
            <form
              key={ticket.id}
              action={replyToOrgSupportTicketFormAction}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <input type="hidden" name="ticketId" value={ticket.id} />
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{ticketTypeDe(ticket.type)}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{ticketStatusDe(ticket.status)}</span>
              </div>
              <p className="mt-2 text-sm font-semibold">{ticket.subject}</p>
              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{ticket.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Von {ticket.user.name ?? ticket.user.email} · {new Date(ticket.createdAt).toLocaleString("de-DE")}
              </p>
              {ticket.response ? (
                <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap">
                  <span className="text-[11px] font-medium text-muted-foreground">Bisherige Antwort: </span>
                  {ticket.response}
                </div>
              ) : null}
              <div className="mt-3 grid gap-2 md:grid-cols-[160px_1fr_auto] md:items-end">
                <div>
                  <label className="text-[11px] text-muted-foreground">Status (ohne neue Antwort)</label>
                  <select
                    name="status"
                    defaultValue={ticket.status}
                    className="mt-1 w-full rounded-xl px-3 py-2 text-sm"
                  >
                    <option value={TicketStatus.OPEN}>Offen</option>
                    <option value={TicketStatus.PENDING}>In Bearbeitung</option>
                    <option value={TicketStatus.RESOLVED}>Beantwortet</option>
                    <option value={TicketStatus.CLOSED}>Gelöst</option>
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="text-[11px] text-muted-foreground">Antwort an Mitarbeiter</label>
                  <textarea
                    name="response"
                    rows={3}
                    defaultValue={ticket.response ?? ""}
                    placeholder="Antwort schreiben…"
                    className="mt-1 w-full rounded-xl px-3 py-2 text-sm"
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
    </div>
  );
}
