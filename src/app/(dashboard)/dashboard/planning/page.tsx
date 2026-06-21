import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMySchedule, getOpenShiftTradesForMyRole } from "@/lib/actions/team";
import { EmployeeScheduleBoard } from "@/components/planning/EmployeeScheduleBoard";
import { EmployeeShiftList } from "@/components/planning/EmployeeShiftList";
import { formatShiftRange, shiftSlotLabel } from "@/lib/planning/shift-display";
import {
  planningDecideTradeFormAction,
  planningRequestTakeoverFormAction,
  planningToggleTradeOfferFormAction,
} from "@/app/(dashboard)/dashboard/planning/planning-trade-actions";
import { ShiftManager } from "@/components/dashboard/ShiftManager";
import { TradePushHint } from "@/components/planning/TradePushHint";
import { OpenShiftsBoard } from "@/components/planning/OpenShiftsBoard";
import { getCompanyModulesForTenant } from "@/lib/actions/company-modules";
import { loadPlanningManagerPageData } from "@/lib/planning/planning-page-data";
import { dateForPlannerCycleDay } from "@/lib/planning/cycle-display-date";
import { sortPlannerShiftsChronologically } from "@/lib/planning/sort-shifts";
import { parsePlannerWeekIndex } from "@/lib/planning/focus-week";
import { clampWeekIndex } from "@/lib/shift-cycle";
import Link from "next/link";
import { CalendarClock, Handshake, Inbox } from "lucide-react";
import { Suspense } from "react";
import { FormSubmitButton } from "@/components/ui/FormSubmitButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShiftTradeApprovalDiff } from "@/components/planning/ShiftTradeApprovalDiff";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardSectionCard } from "@/components/dashboard/DashboardSectionCard";
import {
  PlanningManagerExtras,
  PlanningTradeApprovalsHint,
} from "@/components/planning/PlanningManagerExtras";
import { vocabularyLabels } from "@/lib/vocabulary";

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
  const companyId = session.user.companyId;
  const canManage = ["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role);

  if (canManage && companyId) {
    const data = await loadPlanningManagerPageData(companyId, role);
    const planLabels = vocabularyLabels(data.shiftVocabulary);
    const initialFocusWeek = parsePlannerWeekIndex(params.focusWeek, data.shiftCycleWeeks);
    const initialAutopilotAction =
      params.autopilot === "suggest" ? "suggest" : params.autopilot === "1" ? "focus" : null;

    return (
      <DashboardPageShell maxWidth="6xl">
        {data.loadErrors.length > 0 ? (
          <p className="rounded-xl border border-warning/30 bg-warning-soft/40 px-4 py-2 text-xs text-warning-foreground">
            Einige Planer-Daten konnten nicht geladen werden ({data.loadErrors.join(", ")}). Der Planer bleibt
            nutzbar — bitte Seite neu laden oder Support, falls es anhält.
          </p>
        ) : null}
        <DashboardPageHeader
          variant="card"
          icon={CalendarClock}
          eyebrow="Planung"
          title={planLabels.planTitle}
          description="Tag antippen → Person wählen → Uhrzeit eintragen → Speichern."
          className="hidden md:block"
        />
        <PlanningTradeApprovalsHint count={data.pendingTrades.length} />
        <Suspense
          fallback={
            <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
              Planer lädt…
            </div>
          }
        >
          <ShiftManager
            companyName={data.companyName}
            plan={session.user.plan ?? "STARTER"}
            members={data.members.map((m) => ({
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
            shifts={data.shifts.map((s) => ({
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
            shiftCycleWeeks={data.shiftCycleWeeks}
            initialFocusWeek={initialFocusWeek}
            vacationConflictDays={data.vacationConflictDays}
            unavailableDaysByUserId={data.unavailableDaysByUserId}
            enableTaskListActions={canManage}
            initialAutopilotAction={initialAutopilotAction}
            shiftTemplates={data.shiftTemplates}
            companyModules={data.companyModules}
            planTitle={planLabels.planTitle}
            holidayRegion={data.holidayRegion}
          />
        </Suspense>
        {data.companyModules.shiftTrade ? (
          <PlanningManagerExtras
            label={`Offene Schichten${data.openShifts.length > 0 ? ` (${data.openShifts.length})` : ""}`}
          >
            <OpenShiftsBoard open={data.openShifts} />
          </PlanningManagerExtras>
        ) : null}
        {data.companyModules.shiftTrade && data.pendingTrades.length > 0 ? (
          <PlanningManagerExtras
            label={`Tausch-Freigaben (${data.pendingTrades.length})`}
            defaultOpen
          >
          <DashboardSectionCard
            id="shift-trade-approvals"
            title="Schicht-Tausch: Offene Bestätigungen"
            description="Vorher/Nachher prüfen und freigeben."
            icon={Handshake}
            className="scroll-mt-24"
          >
            <div className="space-y-2">
              {data.pendingTrades.map((trade) => {
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
          </DashboardSectionCard>
          </PlanningManagerExtras>
        ) : null}
      </DashboardPageShell>
    );
  }

  const employeeModules = await getCompanyModulesForTenant().catch(() => ({
    peaks: false,
    plannerWeather: false,
    shiftTrade: false,
    shiftTasks: false,
    autopilot: false,
  }));

  const [schedule, openTrades] = await Promise.all([
    getMySchedule(),
    employeeModules.shiftTrade ? getOpenShiftTradesForMyRole() : Promise.resolve([]),
  ]);

  const sortedShifts = sortPlannerShiftsChronologically(schedule.shifts);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const firstUpcomingId = sortedShifts.find((r) => {
    const wk = clampWeekIndex(r.weekIndex ?? 1, schedule.shiftCycleWeeks);
    return dateForPlannerCycleDay(wk, r.dayOfWeek).getTime() >= todayStart.getTime();
  })?.id;

  const listItems = sortedShifts.map((r) => {
    const wk = clampWeekIndex(r.weekIndex ?? 1, schedule.shiftCycleWeeks);
    const when = dateForPlannerCycleDay(wk, r.dayOfWeek);
    const isPast = when.getTime() < todayStart.getTime();
    return {
      id: r.id,
      dateLine: when.toLocaleDateString("de-DE", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      timeLine: `${formatShiftRange(String(r.startTime), String(r.endTime))} Uhr`,
      slotLabel: shiftSlotLabel(String(r.startTime)),
      weekLabel: schedule.shiftCycleWeeks > 1 ? `Woche ${wk}` : undefined,
      isPast,
      isNext: r.id === firstUpcomingId,
      isOpenForTrade: Boolean(r.isOpenForTrade),
      breakMinutes: Number(r.breakDuration ?? 0),
    };
  });

  return (
    <DashboardPageShell maxWidth="3xl">
      <DashboardPageHeader
        variant="hero"
        eyebrow="Planung"
        title="Mein Dienstplan"
        description="Woche, Uhrzeit und Tausch — ohne den Chef-Planer. Oben die Woche, unten alle Termine mit Aktionen."
        hideOnMobile
      />

      {employeeModules.shiftTrade ? <TradePushHint /> : null}

      <EmployeeScheduleBoard
        shifts={schedule.shifts.map((r) => ({
          id: r.id,
          weekIndex: Number(r.weekIndex),
          dayOfWeek: Number(r.dayOfWeek),
          startTime: String(r.startTime),
          endTime: String(r.endTime),
          breakDuration: Number(r.breakDuration ?? 0),
          isOpenForTrade: Boolean(r.isOpenForTrade),
        }))}
        shiftCycleWeeks={schedule.shiftCycleWeeks}
        companyName={schedule.companyName}
        initialWeekIndex={schedule.currentWeekIndex}
      />

      <EmployeeShiftList
        title={schedule.shiftCycleWeeks > 1 ? "Alle Einsätze im Zyklus" : "Deine Einsätze"}
        items={listItems}
        renderTradeAction={
          employeeModules.shiftTrade
            ? (item) => (
                <form action={planningToggleTradeOfferFormAction} className="inline">
                  <input type="hidden" name="shiftId" value={item.id} />
                  <input type="hidden" name="makeOpen" value={item.isOpenForTrade ? "false" : "true"} />
                  <FormSubmitButton
                    label={item.isOpenForTrade ? "Tausch beenden" : "Zum Tausch anbieten"}
                    pendingLabel="Speichere..."
                    className="btn-outline text-xs"
                  />
                </form>
              )
            : undefined
        }
      />

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
    </DashboardPageShell>
  );
}
