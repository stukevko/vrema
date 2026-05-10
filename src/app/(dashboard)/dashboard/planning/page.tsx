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
import { StatusBadge } from "@/components/ui/StatusBadge";

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
        <div className="glass-card px-4 py-3 sm:px-5 sm:py-4">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Planung</h1>
          <p className="mt-1 text-sm text-muted-foreground">Schichtplanung für Team und Soll/Ist-Basis.</p>
        </div>
        <ShiftManager
          members={members.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            role: m.role,
            image: m.image ?? null,
            weeklyHours: m.weeklyHours,
            hourlyWage: m.hourlyWage ?? null,
            planningWorkArea: m.planningWorkArea ?? null,
          }))}
          shifts={shifts}
          shiftCycleWeeks={shiftCycleWeeks}
          vacationConflictDays={vacationConflictDays}
          enableTaskListActions={canManage}
        />
        {pendingTrades.length > 0 && (
          <section id="shift-trade-approvals" className="glass-card p-5">
            <h2 className="text-base font-semibold">Schicht-Tausch: Offene Bestätigungen</h2>
            <div className="mt-3 space-y-2">
              {pendingTrades.map((trade) => {
                const intelTone =
                  trade.intel?.badge === "green"
                    ? "success"
                    : trade.intel?.badge === "amber"
                      ? "warning"
                      : "danger";
                return (
                  <form
                    key={trade.id}
                    action={decideTradeFormAction}
                    className="rounded-xl border border-line bg-surface px-4 py-3 dark:border-white/10 dark:bg-surface/85"
                  >
                    <input type="hidden" name="shiftId" value={trade.id} />
                    <p className="text-sm">
                      {trade.requestedByName} möchte Schicht von {trade.fromName} übernehmen ({DAY_LABELS[trade.dayOfWeek]}{" "}
                      {trade.startTime}-{trade.endTime})
                    </p>
                    {trade.intel ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge tone={intelTone} glass size="sm">
                          {trade.intel.badge === "green"
                            ? "Rechtlich sicher & kostenneutral"
                            : trade.intel.badge === "amber"
                              ? "Freigabe möglich: Kosten- oder Soll-Hinweis"
                              : "Freigabe gesperrt: Konflikt"}
                        </StatusBadge>
                        <span className="text-[11px] text-muted-foreground">{trade.intel.managerLine}</span>
                      </div>
                    ) : null}
                    {trade.intel?.detailLines?.length ? (
                      <ul className="mt-1 list-inside list-disc text-[11px] text-muted-foreground">
                        {trade.intel.detailLines.map((line, i) => (
                          <li key={`${trade.id}-d-${i}`}>{line}</li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="mt-2 flex gap-2">
                      <FormSubmitButton
                        name="approve"
                        value="true"
                        label="Bestätigen"
                        pendingLabel="Speichere..."
                        disabled={Boolean(trade.intel && !trade.intel.legalOk)}
                        className="btn-brand text-xs"
                      />
                      <FormSubmitButton
                        name="approve"
                        value="false"
                        label="Ablehnen"
                        pendingLabel="Speichere..."
                        className="btn-outline text-xs"
                      />
                    </div>
                  </form>
                );
              })}
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
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="glass-card px-5 py-4">
        <h1 className="text-2xl font-bold">Mein Plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">Übersicht Ihrer hinterlegten Soll-Schichten pro Woche.</p>
      </div>
      <section className="glass-card p-5">
        <div className="grid gap-3 md:grid-cols-2">
          {grouped.map((g) => (
            <div
              key={g.label}
              className="rounded-xl border border-line bg-surface px-4 py-3 dark:border-white/10 dark:bg-surface/85"
            >
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{g.label}</p>
              {g.rows.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">Frei</p>
              ) : (
                <div className="mt-2 space-y-1">
                  {g.rows.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-lg border border-line bg-surface px-3 py-2 dark:border-white/10 dark:bg-surface/90"
                    >
                      <p className="font-sans text-sm text-brand">
                        {r.startTime} - {r.endTime}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {r.isOpenForTrade ? (
                          <StatusBadge tone="warning" glass size="sm" withDot={false}>
                            🔄 Zum Tausch angeboten
                          </StatusBadge>
                        ) : null}
                        <form action={toggleOfferFormAction}>
                          <input type="hidden" name="shiftId" value={r.id} />
                          <input type="hidden" name="makeOpen" value={r.isOpenForTrade ? "false" : "true"} />
                          <FormSubmitButton
                            label={r.isOpenForTrade ? "Tausch beenden" : "Schicht zum Tausch anbieten"}
                            pendingLabel="Speichere..."
                            className="btn-outline text-[11px]"
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
      <section className="glass-card p-5">
        <h2 className="text-base font-semibold">Offene Tausch-Schichten</h2>
        {openTrades.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-line bg-surface-muted/70 px-4 py-6 text-center dark:border-white/10 dark:bg-surface-muted/40">
            <Handshake className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium text-foreground">Noch keine Tauschanfragen</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Alles im grünen Bereich – aktuell ist kein Tausch offen.
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {openTrades.map((trade) => (
              <div
                key={trade.id}
                className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 dark:border-white/10 dark:bg-warning/22"
              >
                <p className="text-sm font-medium text-warning-foreground">
                  🔄 {trade.ownerName}: {DAY_LABELS[trade.dayOfWeek]} {trade.startTime}-{trade.endTime}
                </p>
                <form action={requestTakeoverFormAction} className="mt-2">
                  <input type="hidden" name="shiftId" value={trade.id} />
                  <FormSubmitButton
                    label="Übernahme anfragen"
                    pendingLabel="Sende..."
                    className="btn-brand text-xs"
                  />
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
      {myShifts.length === 0 ? (
        <section className="glass-card border-dashed p-6 text-center">
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium text-foreground">Noch keine eigenen Schichten</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sobald dein Team dich einplant, siehst du hier deinen Wochenplan.
          </p>
        </section>
      ) : null}
    </div>
  );
}
