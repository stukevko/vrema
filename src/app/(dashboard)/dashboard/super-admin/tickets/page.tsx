import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listSupportTicketsForSuperAdmin, replyToSupportTicket } from "@/lib/actions/support";

export default async function SuperAdminTicketsPage() {
  const session = await auth();
  const isSuperAdmin =
    session?.user?.role === "SUPER_ADMIN" || session?.user?.id === process.env.SUPER_ADMIN_USER_ID;
  if (!isSuperAdmin) redirect("/dashboard");

  const tickets = await listSupportTicketsForSuperAdmin();

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-1 sm:px-0">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
        <h1 className="text-2xl font-bold">Support-Tickets</h1>
        <p className="mt-1 text-sm text-muted-foreground">Zentrale Übersicht aller eingereichten Support-Anfragen.</p>
      </div>

      <div className="space-y-3">
        {tickets.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Keine Tickets offen.</div>
        ) : (
          tickets.map((ticket) => (
            <form
              key={ticket.id}
              action={async (formData) => {
                "use server";
                await replyToSupportTicket({
                  ticketId: ticket.id,
                  response: String(formData.get("response") ?? ""),
                  status: String(formData.get("status") ?? "PENDING") as "OPEN" | "PENDING" | "CLOSED",
                });
              }}
              className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{ticket.type}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{ticket.status}</span>
                <span className="text-xs text-muted-foreground">{ticket.org.name}</span>
              </div>
              <p className="mt-2 text-sm font-semibold">{ticket.subject}</p>
              <p className="mt-1 text-sm text-muted-foreground">{ticket.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Von {ticket.user.name ?? ticket.user.email} · {new Date(ticket.createdAt).toLocaleString("de-DE")}
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-[160px_1fr_auto]">
                <select name="status" defaultValue={ticket.status} className="rounded-xl border border-border bg-white px-3 py-2 text-sm">
                  <option value="OPEN">OPEN</option>
                  <option value="PENDING">PENDING</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
                <input
                  name="response"
                  defaultValue={ticket.response ?? ""}
                  placeholder="Antwort an das Team..."
                  className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
                />
                <button type="submit" className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-foreground">
                  Speichern
                </button>
              </div>
            </form>
          ))
        )}
      </div>
    </div>
  );
}
