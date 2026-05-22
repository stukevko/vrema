import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  getMyShifts,
  getOpenShiftTradesForMyRole,
  getPendingTradeApprovals,
  getShiftCycleWeeks,
  getShifts,
  getTeamMembers,
  ensureEmployeeNumbersAssigned,
} from "@/lib/actions/team";
import { getVacationConflictDaysForPlanning } from "@/lib/actions/vacation";
import {
  planningDecideTradeFormAction,
  planningRequestTakeoverFormAction,
  planningToggleTradeOfferFormAction,
} from "@/app/(dashboard)/dashboard/planning/planning-trade-actions";
import { ShiftManager } from "@/components/dashboard/ShiftManager";
// Planer-Lösch-Actions an diese Route binden (stabile Server-Action-IDs)
export { clearPlannerShiftSlot, removePlannerShift } from "@/lib/actions/planner-shift-remove";
import { TradePushHint } from "@/components/planning/TradePushHint";
import { OpenShiftsBoard } from "@/components/planning/OpenShiftsBoard";
import { getUnavailableDaysByUserIds } from "@/lib/actions/work-schedule";
import { getShiftTemplates } from "@/lib/actions/shift-templates";
import { getCompanyModulesForTenant } from "@/lib/actions/company-modules";
import { dateForPlannerCycleDay, dayOrderMonFirst } from "@/lib/planning/cycle-display-date";
import { parsePlannerWeekIndex } from "@/lib/planning/focus-week";
import { logServerError } from "@/lib/server-logger";
import Link from "next/link";
import { Handshake, Inbox, ListTodo } from "lucide-react";
import { Suspense } from "react";
import { FormSubmitButton } from "@/components/ui/FormSubmitButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShiftTradeApprovalDiff } from "@/components/planning/ShiftTradeApprovalDiff";

const DAY_LABELS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{
    focusWeek?: string;
    focus?: string;
    week?: string;
    day?: string;
    autopilot?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const params = await searchParams;
  const role = session.user.role ?? "EMPLOYEE";
  const canManage = ["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role);

  if (canManage) {
    try {
      await ensureEmployeeNumbersAssigned();
    } catch {
      // bei Serialisierungskonflikten Planung trotzdem laden
    }
    const settled = await Promise.allSettled([
      getTeamMembers(),
      getShifts(),
      getVacationConflictDaysForPlanning(),
      getShiftCycleWeeks(),
      getPendingTradeApprovals(),
      getShiftTemplates(),
    ]);
    const members = settled[0].status === "fulfilled" ? settled[0].value : [];
    const shifts = settled[1].status === "fulfilled" ? settled[1].value : [];
    const vacationConflictDays = settled[2].status === "fulfilled" ? settled[2].value : [];
    const shiftCycleWeeksRaw = settled[3].status === "fulfilled" ? settled[3].value : 1;
    const shiftCycleWeeks = (shiftCycleWeeksRaw === 2 ? 2 : shiftCycleWeeksRaw === 3 ? 3 : 1) as 1 | 2 | 3;
    const initialFocusWeek = parsePlannerWeekIndex(params.focusWeek, shiftCycleWeeks);
    const initialAutopilotAction =
      params.autopilot === "suggest" ? "suggest" : params.autopilot === "1" ? "focus" : null;
    const pendingTrades =
      settled[4].status === "fulfilled" ? settled[4].value : ([] as Awaited<ReturnType<typeof getPendingTradeApprovals>>);
    const shiftTemplates = settled[5].status === "fulfilled" ? settled[5].value : [];
    const companyModules = await getCompanyModulesForTenant().catch(() => ({
      peaks: false,
      plannerWeather: false,
      shiftTrade: true,
      shiftTasks: false,
      autopilot: false,
    }));
    settled.forEach((r, i) => {
      if (r.status === "rejected") {
        logServerError(`planning.page.data[${i}]`, r.reason, { step: i });
      }
    });
    const unavailableMap = await getUnavailableDaysByUserIds(members.map((m) => m.id));
    const unavailableDaysByUserId = Object.fromEntries(
      [...unavailableMap.entries()].map(([userId, days]) => [userId, [...days]]),
    );
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-1 sm:space-y-6 sm:px-0">
        <div className="glass-card flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-5 sm:py-4">
          <div>
            <h1 className="text-base font-bold tracking-tight sm:text-xl md:text-2xl">Schichtplanung</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Leitung: Plan, Status und Freigaben. Mitarbeitende sehen unter demselben Menüpunkt nur „Mein Dienstplan“.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 self-start">
            {companyModules.shiftTasks ? (
              <Link
                href="/dashboard/tasks"
                className="btn-outline inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold"
              >
                <ListTodo className="h-4 w-4" aria-hidden />
                Schicht-Tasks
              </Link>
            ) : null}
            {!companyModules.peaks || !companyModules.autopilot ? (
              <Link
                href="/dashboard/settings"
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-background px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Erweiterungen in Einstellungen
              </Link>
            ) : null}
          </div>
        </div>
        <Suspense
          fallback={
            <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
              Planer lädt…
            </div>
          }
        >
        <ShiftManager
          members={members.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            role: m.role,
            image: m.image != null ? String(m.image) : null,
            weeklyHours: m.weeklyHours != null ? Number(m.weeklyHours) : undefined,
            hourlyWage:
              m.hourlyWage != null && Number.isFinite(Number(m.hourlyWage)) ? Number(m.hourlyWage) : null,
            planningWorkArea: m.planningWorkArea != null ? String(m.planningWorkArea) : null,
          }))}
          shifts={shifts.map((s) => ({
            id: s.id,
            userId: s.userId,
            weekIndex: Number(s.weekIndex),
            dayOfWeek: Number(s.dayOfWeek),
            startTime: String(s.startTime),
            endTime: String(s.endTime),
            breakDuration: Number(s.breakDuration ?? 0),
            isDraft: Boolean(s.isDraft),
            staffingRole: s.staffingRole != null ? String(s.staffingRole) : null,
            isOpenForTrade: Boolean(s.isOpenForTrade),
            tradeStatus: s.tradeStatus as "NONE" | "OPEN" | "PENDING_APPROVAL",
            tradeRequestedBy: s.tradeRequestedBy ?? null,
          }))}
          shiftCycleWeeks={shiftCycleWeeks}
          initialFocusWeek={initialFocusWeek}
          vacationConflictDays={vacationConflictDays}
          unavailableDaysByUserId={unavailableDaysByUserId}
          enableTaskListActions={canManage}
          initialAutopilotAction={initialAutopilotAction}
          shiftTemplates={shiftTemplates}
          companyModules={companyModules}
        />
        </Suspense>
        {companyModules.shiftTrade ? <OpenShiftsBoard /> : null}
        {companyModules.shiftTrade && pendingTrades.length > 0 && (
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
                    action={planningDecideTradeFormAction}
                    className="rounded-xl border border-line bg-surface px-4 py-3 dark:border-white/10 dark:bg-surface/85"
                  >
                    <input type="hidden" name="shiftId" value={trade.id} />
                    <p className="text-sm font-medium text-foreground">Schicht-Tausch zur Freigabe</p>
                    <ShiftTradeApprovalDiff
                      dayLabel={DAY_LABELS[trade.dayOfWeek] ?? "Tag"}
                      startTime={trade.startTime}
                      endTime={trade.endTime}
                      fromName={trade.fromName}
                      toName={trade.requestedByName}
                    />
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

  const employeeModules = await getCompanyModulesForTenant().catch(() => ({
    peaks: false,
    plannerWeather: false,
    shiftTrade: false,
    shiftTasks: false,
    autopilot: false,
  }));

  const [myShifts, openTrades] = await Promise.all([
    getMyShifts(),
    employeeModules.shiftTrade ? getOpenShiftTradesForMyRole() : Promise.resolve([]),
  ]);

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

      {employeeModules.shiftTrade ? <TradePushHint /> : null}

      <section className="glass-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Nächste Einsätze</h2>
        {sortedShifts.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={Inbox}
            title="Noch keine Schichten"
            description="Sobald dich dein Team einplant, erscheinen deine Termine hier."
          />
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
                    {employeeModules.shiftTrade ? (
                      <form action={planningToggleTradeOfferFormAction} className="inline">
                        <input type="hidden" name="shiftId" value={r.id} />
                        <input type="hidden" name="makeOpen" value={r.isOpenForTrade ? "false" : "true"} />
                        <FormSubmitButton
                          label={r.isOpenForTrade ? "Tausch beenden" : "Zum Tausch anbieten"}
                          pendingLabel="Speichere..."
                          className="btn-outline text-xs"
                        />
                      </form>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {employeeModules.shiftTrade ? (
      <section className="glass-card p-5">
        <h2 className="text-base font-semibold tracking-tight">Offene Schichten</h2>
        {openTrades.length === 0 ? (
          <EmptyState
            className="mt-3"
            icon={Handshake}
            title="Keine offenen Tausche"
            description="Wenn Kolleg:innen eine Schicht tauschen möchten, erscheint das hier."
          />
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
                <form action={planningRequestTakeoverFormAction} className="mt-2">
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
      ) : null}
    </div>
  );
}
