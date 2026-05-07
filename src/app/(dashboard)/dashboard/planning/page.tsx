import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  getMyShifts,
  getOpenShiftTradesForMyRole,
  getPendingTradeApprovals,
  getShiftCycleWeeks,
  getShifts,
  getTeamMembers,
  requestShiftTradeTakeover,
  toggleShiftTradeOffer,
  decideShiftTradeApproval,
} from "@/lib/actions/team";
import { getVacationConflictDaysForPlanning } from "@/lib/actions/vacation";
import { ShiftManager } from "@/components/dashboard/ShiftManager";
import { Handshake, Inbox } from "lucide-react";
import { FormSubmitButton } from "@/components/ui/FormSubmitButton";

const DAY_LABELS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

export default async function PlanningPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const role = session.user.role ?? "EMPLOYEE";
  const canManage = ["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role);

  async function toggleOfferFormAction(formData: FormData) {
    "use server";
    const shiftId = String(formData.get("shiftId") ?? "");
    const makeOpen = String(formData.get("makeOpen") ?? "") === "true";
    if (!shiftId) return;
    await toggleShiftTradeOffer(shiftId, makeOpen);
  }

  async function requestTakeoverFormAction(formData: FormData) {
    "use server";
    const shiftId = String(formData.get("shiftId") ?? "");
    if (!shiftId) return;
    await requestShiftTradeTakeover(shiftId);
  }

  async function decideTradeFormAction(formData: FormData) {
    "use server";
    const shiftId = String(formData.get("shiftId") ?? "");
    const approve = String(formData.get("approve") ?? "") === "true";
    if (!shiftId) return;
    await decideShiftTradeApproval(shiftId, approve);
  }

  if (canManage) {
    const [members, shifts, vacationConflictDays, shiftCycleWeeks, pendingTrades] = await Promise.all([
      getTeamMembers(),
      getShifts(),
      getVacationConflictDaysForPlanning(),
      getShiftCycleWeeks(),
      getPendingTradeApprovals(),
    ]);
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-1 sm:space-y-6 sm:px-0">
        <div className="rounded-2xl border border-border bg-white px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:px-5 sm:py-4">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Planung</h1>
          <p className="mt-1 text-sm text-muted-foreground">Schichtplanung für Team und Soll/Ist-Basis.</p>
        </div>
        <ShiftManager
          members={members.map((m) => ({ id: m.id, name: m.name, email: m.email }))}
          shifts={shifts}
          shiftCycleWeeks={shiftCycleWeeks}
          vacationConflictDays={vacationConflictDays}
        />
        {pendingTrades.length > 0 && (
          <section id="shift-trade-approvals" className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold">Schicht-Tausch: Offene Bestätigungen</h2>
            <div className="mt-3 space-y-2">
              {pendingTrades.map((trade) => (
                <form key={trade.id} action={decideTradeFormAction} className="rounded-xl border border-border bg-background px-4 py-3">
                  <input type="hidden" name="shiftId" value={trade.id} />
                  <p className="text-sm">
                    {trade.requestedByName} möchte Schicht von {trade.fromName} übernehmen ({DAY_LABELS[trade.dayOfWeek]}{" "}
                    {trade.startTime}-{trade.endTime})
                  </p>
                  <div className="mt-2 flex gap-2">
                    <FormSubmitButton
                      name="approve"
                      value="true"
                      label="Bestätigen"
                      pendingLabel="Speichere..."
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-60"
                    />
                    <FormSubmitButton
                      name="approve"
                      value="false"
                      label="Ablehnen"
                      pendingLabel="Speichere..."
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs disabled:opacity-60"
                    />
                  </div>
                </form>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  const [myShifts, openTrades] = await Promise.all([getMyShifts(), getOpenShiftTradesForMyRole()]);
  const grouped = DAY_LABELS.map((label, dayOfWeek) => ({
    label,
    rows: myShifts.filter((s) => s.dayOfWeek === dayOfWeek),
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-2xl border border-border bg-white px-5 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
        <h1 className="text-2xl font-bold">Mein Plan</h1>
        <p className="text-muted-foreground text-sm mt-1">Übersicht Ihrer hinterlegten Soll-Schichten pro Woche.</p>
      </div>
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-3 md:grid-cols-2">
          {grouped.map((g) => (
            <div key={g.label} className="rounded-xl border border-border bg-background px-4 py-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{g.label}</p>
              {g.rows.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">Frei</p>
              ) : (
                <div className="mt-2 space-y-1">
                  {g.rows.map((r) => (
                    <div key={r.id} className="rounded-lg border border-border bg-white px-3 py-2">
                      <p className="font-sans text-sm text-primary">
                        {r.startTime} - {r.endTime}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        {r.isOpenForTrade ? (
                          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            🔄 Zum Tausch angeboten
                          </span>
                        ) : null}
                        <form action={toggleOfferFormAction}>
                          <input type="hidden" name="shiftId" value={r.id} />
                          <input type="hidden" name="makeOpen" value={r.isOpenForTrade ? "false" : "true"} />
                          <FormSubmitButton
                            label={r.isOpenForTrade ? "Tausch beenden" : "Schicht zum Tausch anbieten"}
                            pendingLabel="Speichere..."
                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium disabled:opacity-60"
                          />
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Offene Tausch-Schichten</h2>
        {openTrades.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center">
            <Handshake className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium text-foreground">Noch keine Tauschanfragen</p>
            <p className="mt-1 text-sm text-muted-foreground">Alles im grünen Bereich - aktuell ist kein Tausch offen.</p>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {openTrades.map((trade) => (
              <div
                key={trade.id}
                className="rounded-xl border border-amber-300 bg-amber-50/70 px-4 py-3"
              >
                <p className="text-sm font-medium text-amber-900">
                  🔄 {trade.ownerName}: {DAY_LABELS[trade.dayOfWeek]} {trade.startTime}-{trade.endTime}
                </p>
                <form action={requestTakeoverFormAction} className="mt-2">
                  <input type="hidden" name="shiftId" value={trade.id} />
                  <FormSubmitButton
                    label="Übernahme anfragen"
                    pendingLabel="Sende..."
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-60"
                  />
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
      {myShifts.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium text-foreground">Noch keine eigenen Schichten</p>
          <p className="mt-1 text-sm text-muted-foreground">Sobald dein Team dich einplant, siehst du hier deinen Wochenplan.</p>
        </section>
      ) : null}
    </div>
  );
}
