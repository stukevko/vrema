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
import { TradePushHint } from "@/components/planning/TradePushHint";
import { dateForPlannerCycleDay, dayOrderMonFirst } from "@/lib/planning/cycle-display-date";
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
          <h1 className="text-base font-bold tracking-tight sm:text-xl md:text-2xl">Schichtplanung</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Leitung: Plan, Status und Freigaben. Mitarbeitende sehen unter demselben Menüpunkt nur „Mein Dienstplan“.
          </p>
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
            <h2 className="text-base font-semibold tracking-tight">Schicht-Tausch: Offene Bestätigungen</h2>
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

  const sortedShifts = [...myShifts].sort((a, b) => {
    const da = dayOrderMonFirst(a.dayOfWeek);
    const db = dayOrderMonFirst(b.dayOfWeek);
    if (da !== db) return da - db;
    return String(a.startTime).localeCompare(String(b.startTime), "de");
  });

  return (
    <div className="mx-auto max-w-lg min-w-0 space-y-5 px-1 sm:max-w-xl sm:space-y-6 sm:px-0">
      <div className="glass-card px-4 py-4 sm:px-5">
        <h1 className="text-base font-bold tracking-tight sm:text-2xl">Mein Dienstplan</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Nur deine Soll-Schichten – getrennt vom Planer der Führungskraft. Zeiten und Tausch an einem Ort.
        </p>
      </div>

      <TradePushHint />

      <section className="glass-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Nächste Einsätze</h2>
        {sortedShifts.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-line bg-surface-muted/60 px-4 py-8 text-center dark:border-white/10">
            <Inbox className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm font-medium text-foreground">Noch keine Schichten</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sobald dich dein Team einplant, erscheinen die Termine hier als Liste.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {sortedShifts.map((r) => {
              const wk = (r.weekIndex ?? 1) as 1 | 2 | 3;
              const when = dateForPlannerCycleDay(wk, r.dayOfWeek);
              const dateLine = when.toLocaleDateString("de-DE", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });
              return (
                <li
                  key={r.id}
                  className="rounded-2xl border border-line bg-surface px-4 py-3 shadow-sm dark:border-white/10 dark:bg-surface/90"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dateLine}</p>
                  <p className="mt-1 font-sans text-lg font-bold tabular-nums text-brand">
                    {String(r.startTime).slice(0, 5)} – {String(r.endTime).slice(0, 5)} Uhr
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {r.isOpenForTrade ? (
                      <StatusBadge tone="warning" glass size="sm" withDot={false}>
                        Zum Tausch angeboten
                      </StatusBadge>
                    ) : null}
                    <form action={toggleOfferFormAction} className="inline">
                      <input type="hidden" name="shiftId" value={r.id} />
                      <input type="hidden" name="makeOpen" value={r.isOpenForTrade ? "false" : "true"} />
                      <FormSubmitButton
                        label={r.isOpenForTrade ? "Tausch beenden" : "Zum Tausch anbieten"}
                        pendingLabel="Speichere..."
                        className="btn-outline text-xs"
                      />
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="glass-card p-5">
        <h2 className="text-base font-semibold tracking-tight">Offene Tausch-Schichten</h2>
        {openTrades.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-line bg-surface-muted/70 px-4 py-6 text-center dark:border-white/10 dark:bg-surface-muted/40">
            <Handshake className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm font-medium text-foreground">Keine offenen Tausche</p>
            <p className="mt-1 text-sm text-muted-foreground">Wenn Kolleg:innen eine Schicht tauschen möchten, erscheint das hier.</p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {openTrades.map((trade) => (
              <li
                key={trade.id}
                className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 dark:border-white/10 dark:bg-warning/22"
              >
                <p className="text-sm font-medium text-warning-foreground">
                  Tausch: {trade.ownerName} · {DAY_LABELS[trade.dayOfWeek]} {trade.startTime}–{trade.endTime}
                </p>
                <form action={requestTakeoverFormAction} className="mt-2">
                  <input type="hidden" name="shiftId" value={trade.id} />
                  <FormSubmitButton
                    label="Übernahme anfragen"
                    pendingLabel="Sende..."
                    className="btn-brand text-xs"
                  />
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
