import { auth } from "@/auth";
import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { redirect } from "next/navigation";
import { TerminalWidget } from "@/components/dashboard/TerminalWidget";
import { LiveOperationsWidget } from "@/components/dashboard/LiveOperationsWidget";
import { EmployeeCockpit } from "@/components/dashboard/EmployeeCockpit";
import { ActiveShiftTasksCard } from "@/components/dashboard/ActiveShiftTasksCard";
import { HeroStats } from "@/components/dashboard/HeroStats";
import { EmptyTeamBanner } from "@/components/dashboard/EmptyTeamBanner";
import { NoShowCard } from "@/components/dashboard/NoShowCard";
import { getEmployeeCockpitData } from "@/lib/dashboard/employee-cockpit-data";
import { SaldoWidget } from "@/components/dashboard/SaldoWidget";
import { calculateSaldo } from "@/lib/actions/worklogs";
import {
  CalendarDays,
  CalendarPlus,
  FileText,
  PartyPopper,
} from "lucide-react";
import { IconMenu } from "@/components/ui/IconMenu";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";
import {
  AbsenceRequestStatus,
  CorrectionRequestStatus,
  EntryStatus,
  ShiftTradeStatus,
  UserRole,
  VacationStatus,
} from "@prisma/client";
import { Suspense } from "react";
import { getSuperAdminMonitoring, getSuperAdminOverview } from "@/lib/actions/super-admin";
import { SuperAdminInlinePanel } from "@/components/dashboard/SuperAdminInlinePanel";
import { SundayWeekPlannerBanner } from "@/components/dashboard/SundayWeekPlannerBanner";
import { OwnerWelcomeStrip } from "@/components/dashboard/OwnerWelcomeStrip";
import { buildForecastHorizon } from "@/lib/planning/forecast-horizon";
import { queryActiveShiftTasks } from "@/lib/shift-tasks/active-shift-tasks-data";
import { getTodayShiftTaskWall } from "@/lib/shift-tasks/wall";
import { formatBerlinDate, formatBerlinTime, getBerlinNowHour, getDayBoundsUtc } from "@/lib/time/timezone";
import { sumPersonnelCostEuro, workedMinutesForCostEstimate } from "@/lib/time/payroll";
import { logServerError } from "@/lib/server-logger";
import { getCompanyModulesForTenant } from "@/lib/actions/company-modules";
import type { CompanyModules } from "@/lib/company-modules";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { ManagerMobileCockpit } from "@/components/dashboard/ManagerMobileCockpit";
import { CollapsibleMobileSection } from "@/components/dashboard/CollapsibleMobileSection";
import { DashboardSectionCard } from "@/components/dashboard/DashboardSectionCard";
import { vocabularyLabels } from "@/lib/vocabulary";

/**
 * Defensive: optionale Sektionen dürfen niemals die ganze Seite zerschießen.
 * Klassisches B2B-SaaS-Verhalten: lieber Karte ausblenden + im Server-Log mitloggen,
 * als ein „kompletter Crash"-Screen für den Mitarbeiter beim Einstempeln.
 */
function safe<T>(p: Promise<T>, scope: string, fallback: T): Promise<T> {
  return p.catch((err) => {
    logServerError(scope, err);
    return fallback;
  });
}

type TeamStatsSnapshot = {
  totalEmployees: number;
  activeToday: number;
  pendingVacations: number;
  absentToday: number;
  lateToday: number;
  pendingCorrections: number;
  pendingTradeApprovals: number;
};

/** Eine klare Leitlinie für Owner/Manager/Super-Admin — weniger „Command Center“, mehr Führung. */
function managerPrimaryFocus(
  stats: TeamStatsSnapshot,
  modules: CompanyModules,
  vocab: { singular: string; planTitle: string },
) {
  if (stats.absentToday > 0) {
    return {
      title: `${stats.absentToday} fehlende Anwesenheit${stats.absentToday === 1 ? "" : "en"} heute`,
      description: "Prüfe Stempelungen und Abwesenheiten im Team, bevor du nachjustierst.",
      href: "/dashboard/reports",
      cta: "Zu den Berichten",
    };
  }
  if (stats.pendingCorrections > 0) {
    return {
      title: `${stats.pendingCorrections} offene Zeitkorrektur${stats.pendingCorrections === 1 ? "" : "en"}`,
      description: "Änderungen im Bericht mit Vorher/Nachher prüfen und freigeben.",
      href: "/dashboard/reports#zeitkorrekturen",
      cta: "Korrekturen prüfen",
    };
  }
  if (modules.shiftTrade && stats.pendingTradeApprovals > 0) {
    return {
      title: `${stats.pendingTradeApprovals} Tauschantrag${stats.pendingTradeApprovals === 1 ? "" : "e"} warten auf Freigabe`,
      description: `Prüfe offene Übernahme-Anfragen, bevor der ${vocab.singular} startet.`,
      href: "/dashboard/planning",
      cta: "Tausch prüfen",
    };
  }
  if (stats.lateToday > 0) {
    return {
      title: `${stats.lateToday} verspätete Ankunft${stats.lateToday === 1 ? "" : "en"} heute`,
      description: `Kurz im ${vocab.planTitle} oder in den Zeiten gegenprüfen.`,
      href: "/dashboard/planning",
      cta: "Zur Planung",
    };
  }
  if (stats.pendingVacations > 0) {
    return {
      title: `${stats.pendingVacations} Urlaubsantrag${stats.pendingVacations === 1 ? "" : "e"} offen`,
      description: "Resturlaub & Konflikte werden direkt am Antrag angezeigt – sicher entscheiden.",
      href: "/dashboard/vacation#team-vacation-requests",
      cta: "Anträge prüfen",
    };
  }
  return {
    title: "Heute keine kritischen Hinweise",
    description: "Planung und Berichte bleiben trotzdem jederzeit griffbereit.",
    href: "/dashboard/planning",
    cta: "Planung öffnen",
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarded?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/auth/login");

  const params = await searchParams;
  const { companyId, id: userId } = session.user as { companyId: string; id: string };
  const plan = session.user.plan ?? "STARTER";
  const role = session.user.role;
  const isSuperAdmin = role === "SUPER_ADMIN" || session.user.id === process.env.SUPER_ADMIN_USER_ID;
  const isManager = role === "COMPANY_OWNER" || role === "MANAGER" || role === "SUPER_ADMIN";
  const isOwner = role === "COMPANY_OWNER" || role === "SUPER_ADMIN";
  const isEmployee = role === "EMPLOYEE";
  const companyModules = await getCompanyModulesForTenant().catch(() => ({
    peaks: false,
    plannerWeather: false,
    shiftTrade: true,
    shiftTasks: false,
    autopilot: false,
  }));

  let showOwnerWelcome = false;
  let ownerWelcomeFocusWeek: number | undefined;
  if (isOwner) {
    const companyMeta = await db.company.findUnique({
      where: { id: companyId },
      select: { shiftCycleWeeks: true },
    });
    const primaryWeek = buildForecastHorizon(companyMeta?.shiftCycleWeeks).find((s) => s.isPrimary);
    ownerWelcomeFocusWeek = primaryWeek?.weekIndex;
    // Nur direkt nach Onboarding — während der Testphase reicht der Trial-Banner (weniger Lärm).
    showOwnerWelcome = params.onboarded === "1";
  }

  const { start: todayStart, end: todayEnd } = getDayBoundsUtc("Europe/Berlin");

  // Performance: ALLES, was nicht voneinander abhängt, in EINE Welle.
  // (vorher: 4 sequentielle await-Blöcke → bis zu ~1,5s extra Latenz bei langsamem PG)
  type TeamStatsRaw = {
    totalEmployees: number;
    activeToday: number;
    pendingVacations: number;
    pendingAbsenceRequests: number;
    absentToday: number;
    lateToday: number;
    pendingCorrections: number;
    pendingTradeApprovals: number;
  };
  const teamStatsPromise: Promise<TeamStatsRaw | null> = isManager
    ? safe(
        Promise.all([
          db.user.count({ where: tenantWhere(companyId, { isActive: true }) }),
          db.workLog.count({ where: tenantWhere(companyId, { clockIn: { gte: todayStart, lte: todayEnd }, clockOut: null }) }),
          db.vacationRequest.count({ where: tenantWhere(companyId, { status: VacationStatus.PENDING }) }),
          db.absence.count({ where: { orgId: companyId, status: AbsenceRequestStatus.REQUESTED } }),
          db.workLog.count({ where: tenantWhere(companyId, { clockIn: { gte: todayStart, lte: todayEnd }, status: EntryStatus.ABSENT }) }),
          db.workLog.count({ where: tenantWhere(companyId, { clockIn: { gte: todayStart, lte: todayEnd }, status: EntryStatus.LATE }) }),
          db.workLogCorrectionRequest.count({
            where: tenantWhere(companyId, { status: CorrectionRequestStatus.PENDING }),
          }),
          db.shift.count({ where: tenantWhere(companyId, { tradeStatus: ShiftTradeStatus.PENDING_APPROVAL }) }),
        ]).then(([totalEmployees, activeToday, pendingVacations, pendingAbsenceRequests, absentToday, lateToday, pendingCorrections, pendingTradeApprovals]) => ({
          totalEmployees,
          activeToday,
          pendingVacations,
          pendingAbsenceRequests,
          absentToday,
          lateToday,
          pendingCorrections,
          pendingTradeApprovals,
        })),
        "dashboard.teamStats",
        null,
      )
    : Promise.resolve(null);

  // Teamweite Heute-Logs (mit hourlyWage), nur für Manager – Basis für die
  // Hero-KPI "Heutige Personalkosten". Limit 1.000 reicht selbst für große Teams.
  const teamTodayLogsPromise: Promise<Array<{ clockIn: Date; clockOut: Date | null; breakMins: number; user: { hourlyWage: number | null } }> | null> = isManager
    ? safe(
        db.workLog.findMany({
          where: tenantWhere(companyId, { clockIn: { gte: todayStart, lte: todayEnd } }),
          select: {
            clockIn: true,
            clockOut: true,
            breakMins: true,
            user: { select: { hourlyWage: true } },
          },
          take: 1000,
        }),
        "dashboard.teamTodayLogs",
        [] as Array<{ clockIn: Date; clockOut: Date | null; breakMins: number; user: { hourlyWage: number | null } }>,
      )
    : Promise.resolve(null);

  const [
    employeeCount,
    hasAnyWorkLog,
    activeLog,
    todayLogs,
    teamStatsRaw,
    liveOpsRows,
    cockpitData,
    superAdminPayload,
    saldo,
    teamTodayLogs,
    planVocabulary,
  ] = await Promise.all([
    safe(
      db.user.count({
        where: tenantWhere(companyId, {
          isActive: true,
          role: { in: ["MANAGER", "EMPLOYEE"] as UserRole[] },
        }),
      }),
      "dashboard.employeeCount",
      0,
    ),
    safe(
      db.workLog.findFirst({
        where: tenantWhere(companyId, { userId }),
        select: { id: true },
      }),
      "dashboard.hasAnyWorkLog",
      null,
    ),
    safe(
      db.workLog.findFirst({
        where: tenantWhere(companyId, { userId, clockOut: null }),
        select: {
          id: true,
          clockIn: true,
          breakMins: true,
          isOnBreak: true,
          breakStartedAt: true,
        },
      }),
      "dashboard.activeLog",
      null,
    ),
    safe(
      db.workLog.findMany({
        where: tenantWhere(companyId, { userId, clockIn: { gte: todayStart, lte: todayEnd } }),
        orderBy: { clockIn: "desc" },
        select: {
          id: true,
          clockIn: true,
          clockOut: true,
          breakMins: true,
        },
      }),
      "dashboard.todayLogs",
      [] as Array<{ id: string; clockIn: Date; clockOut: Date | null; breakMins: number }>,
    ),
    teamStatsPromise,
    isManager
      ? safe(getTodayShiftTaskWall(companyId), "dashboard.liveOpsWall", [])
      : Promise.resolve([]),
    isEmployee
      ? safe(getEmployeeCockpitData({ companyId, userId }), "dashboard.cockpit", null)
      : Promise.resolve(null),
    isSuperAdmin
      ? Promise.all([
          safe(getSuperAdminOverview(), "dashboard.superAdminOverview", null as Awaited<ReturnType<typeof getSuperAdminOverview>> | null),
          safe(getSuperAdminMonitoring(), "dashboard.superAdminMonitoring", null as Awaited<ReturnType<typeof getSuperAdminMonitoring>> | null),
        ] as const)
      : Promise.resolve([null, null] as const),
    safe(
      calculateSaldo(userId),
      "dashboard.saldo",
      { workedMinutes: 0, expectedMinutes: 0, saldoMinutes: 0, weekLabel: "" },
    ),
    teamTodayLogsPromise,
    safe(
      db.company
        .findUnique({ where: { id: companyId }, select: { shiftVocabulary: true } })
        .then((row) => vocabularyLabels(row?.shiftVocabulary)),
      "dashboard.vocabulary",
      vocabularyLabels("SHIFT"),
    ),
  ]);

  // shiftTasksPayload braucht activeLog → eigene zweite Welle (extrem leichtgewichtig).
  const shiftTasksPayload = activeLog
    ? await safe(queryActiveShiftTasks(userId, companyId), "dashboard.activeShiftTasks", null)
    : null;

  const [superAdminCompanies, superAdminMonitoring] = superAdminPayload;

  const teamStats = teamStatsRaw
    ? {
        totalEmployees: teamStatsRaw.totalEmployees,
        activeToday: teamStatsRaw.activeToday,
        pendingVacations: teamStatsRaw.pendingVacations + teamStatsRaw.pendingAbsenceRequests,
        absentToday: teamStatsRaw.absentToday,
        lateToday: teamStatsRaw.lateToday,
        pendingCorrections: teamStatsRaw.pendingCorrections,
        pendingTradeApprovals: teamStatsRaw.pendingTradeApprovals,
      }
    : null;

  const now = new Date();
  const berlinHour = getBerlinNowHour(now);
  const todayWorkedMins = todayLogs.reduce(
    (acc, log) => acc + workedMinutesForCostEstimate(log, now),
    0,
  );

  const focus = teamStats ? managerPrimaryFocus(teamStats, companyModules, planVocabulary) : null;

  // Hero-KPI: Personalkosten heute (guarded: keine Epoch-Phantom-Minuten).
  const todayPersonnelCostsEuro =
    teamTodayLogs && teamTodayLogs.length > 0 ? sumPersonnelCostEuro(teamTodayLogs, now) : 0;

  const heroAttentionCount = teamStats ? teamStats.absentToday + teamStats.lateToday : 0;
  const heroPendingApprovalsCount = teamStats
    ? teamStats.pendingVacations + teamStats.pendingCorrections + teamStats.pendingTradeApprovals
    : 0;
  const showChefKpiGrid = heroAttentionCount > 0 || heroPendingApprovalsCount > 0;

  const todayWorkedLabel = `${Math.floor(todayWorkedMins / 60)}h ${Math.floor(todayWorkedMins % 60).toString().padStart(2, "0")}m`;

  const todayPanel = (
    <DashboardSectionCard
      title="Heute"
      description={`${todayWorkedLabel} erfasst`}
      padding="comfortable"
      headerAction={
        <IconMenu label="Heute-Optionen">
          <IconMenu.Label>Schnellzugriff</IconMenu.Label>
          <IconMenu.Item asChild icon={<FileText className="h-4 w-4" />}>
            <Link href="/dashboard/reports" className="w-full">Detailbericht öffnen</Link>
          </IconMenu.Item>
          <IconMenu.Item asChild icon={<CalendarPlus className="h-4 w-4" />}>
            <Link href="/dashboard/vacation" className="w-full">Urlaub erfassen</Link>
          </IconMenu.Item>
          <IconMenu.Separator />
          <IconMenu.Item asChild icon={<CalendarDays className="h-4 w-4" />}>
            <Link href="/dashboard/planning" className="w-full">Wochenplan öffnen</Link>
          </IconMenu.Item>
        </IconMenu>
      }
    >
      {todayLogs.length === 0 ? (
        <EmptyState
          tone="celebrate"
          icon={PartyPopper}
          title="Noch kein Zeiteintrag für heute"
          description={
            isEmployee
              ? cockpitData
                ? `Tippe auf den großen Stempel-Button oben, um deinen ${planVocabulary.singular} zu starten.`
                : `Nutze den Stempel-Bereich weiter oben, um deinen ${planVocabulary.singular} zu starten.`
              : "Stemple dich ein oder prüfe die Team-Zeiten in den Berichten."
          }
          action={
            <Link
              href="#terminal-widget"
              className="btn-brand inline-flex min-h-11 items-center justify-center rounded-2xl px-4 text-sm font-bold active:scale-[0.99]"
            >
              Jetzt einstempeln
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {todayLogs.map((log) => {
            const durationMins = log.clockOut
              ? (log.clockOut.getTime() - log.clockIn.getTime()) / 60000 - log.breakMins
              : null;
            return (
              <div
                key={log.id}
                className="flex min-h-[3.25rem] items-center justify-between gap-3 rounded-2xl bg-background px-3 py-3 sm:py-2.5"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2 w-2 rounded-full ${log.clockOut ? "bg-muted-foreground/30" : "animate-pulse bg-brand"}`}
                  />
                  <span className="text-sm text-foreground">
                    {formatBerlinTime(new Date(log.clockIn), { hour: "2-digit", minute: "2-digit" })}
                    {" — "}
                    {log.clockOut
                      ? formatBerlinTime(new Date(log.clockOut), { hour: "2-digit", minute: "2-digit" })
                      : "läuft..."}
                  </span>
                </div>
                {durationMins !== null && (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {Math.floor(durationMins / 60)}h {Math.floor(durationMins % 60).toString().padStart(2, "0")}m
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardSectionCard>
  );

  return (
    <div
      className={`dashboard-page-root mx-auto flex w-full min-w-0 max-w-full flex-col gap-4 overflow-x-hidden px-0 text-foreground sm:max-w-6xl sm:gap-6 sm:px-2 md:gap-8 md:px-0${
        isEmployee && cockpitData ? " max-md:h-full max-md:min-h-0 max-md:flex-1 max-md:gap-0" : ""
      }`}
    >
      {/* Header — für Mitarbeiter überspringen, weil das Cockpit selbst begrüßt */}
      {!isEmployee && (
        <div className="order-1 min-w-0 max-w-full shrink-0 max-md:hidden">
          <DashboardPageHeader
            variant="hero"
            title={`Guten ${berlinHour < 12 ? "Morgen" : berlinHour < 18 ? "Tag" : "Abend"}, ${session.user.name?.split(" ")[0] ?? "Nutzer"} 👋`}
            description={formatBerlinDate(now, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
        </div>
      )}

      {teamStats && (
        <div
          className={`order-1 mt-1 min-w-0 max-md:order-2 sm:mt-2${showChefKpiGrid ? "" : " max-md:hidden"}`}
        >
          <HeroStats
            presentNow={teamStats.activeToday}
            totalEmployees={teamStats.totalEmployees}
            todayPersonnelCostsEuro={todayPersonnelCostsEuro}
            attentionCount={heroAttentionCount}
            attentionBreakdown={{ absent: teamStats.absentToday, late: teamStats.lateToday }}
            pendingApprovalsCount={heroPendingApprovalsCount}
            showKpiGrid={showChefKpiGrid}
            desktopCalm={!showChefKpiGrid}
            mobileGreeting={
              !isEmployee && showChefKpiGrid
                ? `Guten ${berlinHour < 12 ? "Morgen" : berlinHour < 18 ? "Tag" : "Abend"}, ${session.user.name?.split(" ")[0] ?? "Nutzer"} 👋`
                : undefined
            }
            mobileDateLine={formatBerlinDate(now, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          />
        </div>
      )}

      {/* No-Show-Alarm (Manager) — höchste Priorität, immer sichtbar. */}
      {isManager && (
        <div className="order-1">
          <NoShowCard />
        </div>
      )}

      {isManager && teamStats && focus ? (
        <div className="order-2">
          <ManagerMobileCockpit
            focus={focus}
            planTitle={planVocabulary.planTitle}
            firstName={session.user.name?.split(" ")[0]}
          />
        </div>
      ) : null}

      {/* Mitarbeiter: Personal Cockpit – Hero + Stempel + Quick-Stats.
          ID `terminal-widget` migriert hierhin, damit alle Deeplinks („Jetzt einstempeln")
          beim Mitarbeiter direkt auf den großen Stempel-Button springen. */}
      {isEmployee && cockpitData && (
        <div className="order-1 max-md:flex max-md:min-h-0 max-md:flex-1 max-md:flex-col sm:mx-0">
          <EmployeeCockpit
            data={cockpitData}
            firstName={session.user.name?.split(" ")[0] ?? "Hallo"}
            labels={planVocabulary}
          />
        </div>
      )}
      {/* Defensive Fallback: Cockpit-Daten konnten nicht geladen werden.
          Mitarbeiter sieht trotzdem einen klaren Header + den Stempel-Button (über
          das TerminalWidget weiter unten – wir blenden es in dem Fall ein). */}
      {isEmployee && !cockpitData && (
        <div id="terminal-widget" className="order-1 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-5 sm:p-6">
          <h1 className="text-base font-bold tracking-tight sm:text-xl md:text-2xl">
            Hallo {session.user.name?.split(" ")[0] ?? ""} 👋
          </h1>
          <p className="mt-1 text-sm text-amber-900">
            Deine Übersicht konnte gerade nicht geladen werden – du kannst trotzdem unten am Terminal stempeln.
            Beim nächsten Öffnen der Seite wird alles aktualisiert.
          </p>
        </div>
      )}

      {/* Aufgaben prominent: nur sichtbar, wenn eingestempelt + Liste vorhanden */}
      {companyModules.shiftTasks && activeLog && shiftTasksPayload && shiftTasksPayload.items.length > 0 ? (
        <div className={`order-2${isEmployee ? " max-md:hidden" : ""}`}>
          <ActiveShiftTasksCard tasks={shiftTasksPayload} />
        </div>
      ) : null}

      {isSuperAdmin && superAdminCompanies && superAdminMonitoring && (
        <div className="order-3">
          <SuperAdminInlinePanel companies={superAdminCompanies} monitoring={superAdminMonitoring} />
        </div>
      )}

      {/* Team stats (for owners/managers) — Desktop: Fokus + Live-Ops; Mobil: im Cockpit + „Mehr“. */}
      {teamStats && focus && (
        <div className="order-5 min-w-0 space-y-4 md:order-4">
          {focus.title !== "Heute keine kritischen Hinweise" ? (
            <DashboardSectionCard tone="alert" bare padding="default" className="hidden md:block">
              <p className="font-semibold text-foreground">{focus.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{focus.description}</p>
              <Link href={focus.href} className="mt-2 inline-flex text-sm font-semibold text-brand underline-offset-2 hover:underline">
                {focus.cta} →
              </Link>
            </DashboardSectionCard>
          ) : null}

          <CollapsibleMobileSection label="Mehr auf der Startseite" className="space-y-4">
            {showOwnerWelcome && isOwner ? (
              <OwnerWelcomeStrip focusWeek={ownerWelcomeFocusWeek} showPeaksModule={companyModules.peaks} />
            ) : null}

            {isManager && teamStats.totalEmployees <= 1 ? (
              <EmptyTeamBanner teamSize={teamStats.totalEmployees} />
            ) : null}

            {isManager ? <SundayWeekPlannerBanner companyId={companyId} /> : null}

            <LiveOperationsWidget rows={liveOpsRows} />

            <div className="hidden grid-cols-3 gap-2 md:grid">
              {(
                [
                  { href: "/dashboard/planning", label: "Wochenplan" },
                  { href: "/dashboard/reports", label: "Zeiten" },
                  { href: "/dashboard/vacation", label: "Urlaub" },
                ] as const
              ).map((q) => (
                <Link
                  key={q.href}
                  href={q.href}
                  className="flex min-h-11 items-center justify-center rounded-2xl border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors active:scale-[0.99] md:hover:border-brand/35 md:hover:bg-card/80"
                >
                  {q.label}
                </Link>
              ))}
            </div>
          </CollapsibleMobileSection>
        </div>
      )}

      {/* Main grid: Mobil Terminal → Saldo → AI; Desktop gleiche Reihenfolge im Grid.
          Für Mitarbeiter NORMALERWEISE keine TerminalWidget – sie haben oben den BigClockButton.
          Ausnahme: wenn das Cockpit fehlschlägt, brauchen sie irgendeinen Stempel-Weg → wir
          fallback-zeigen das TerminalWidget. */}
      {isManager ? (
        <CollapsibleMobileSection label="Terminal & Saldo" className="order-6 md:order-5">
          <div className="flex flex-col gap-5 md:grid md:grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
            {!isEmployee || !cockpitData ? (
              <div className="order-1 md:order-1">
                <TerminalWidget
                  activeLog={
                    activeLog
                      ? {
                          id: activeLog.id,
                          clockIn: activeLog.clockIn,
                          breakMins: activeLog.breakMins,
                          isOnBreak: activeLog.isOnBreak,
                          breakStartedAt: activeLog.breakStartedAt,
                        }
                      : null
                  }
                />
              </div>
            ) : null}
            <div className="order-2 md:order-2">
              <SaldoWidget
                workedMinutes={saldo.workedMinutes}
                expectedMinutes={saldo.expectedMinutes}
                saldoMinutes={saldo.saldoMinutes}
                weekLabel={saldo.weekLabel}
                hasWorkLogs={Boolean(hasAnyWorkLog)}
              />
            </div>
          </div>
        </CollapsibleMobileSection>
      ) : isEmployee && cockpitData ? null : (
        <div className="order-6 flex flex-col gap-5 md:order-5 md:grid md:grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
          {!isEmployee || !cockpitData ? (
            <div className="order-1 md:order-1">
              <TerminalWidget
                activeLog={
                  activeLog
                    ? {
                        id: activeLog.id,
                        clockIn: activeLog.clockIn,
                        breakMins: activeLog.breakMins,
                        isOnBreak: activeLog.isOnBreak,
                        breakStartedAt: activeLog.breakStartedAt,
                      }
                    : null
                }
              />
            </div>
          ) : null}
          <div className="order-2 md:order-2">
            <SaldoWidget
              workedMinutes={saldo.workedMinutes}
              expectedMinutes={saldo.expectedMinutes}
              saldoMinutes={saldo.saldoMinutes}
              weekLabel={saldo.weekLabel}
              hasWorkLogs={Boolean(hasAnyWorkLog)}
            />
          </div>
        </div>
      )}

      {isManager ? (
        <CollapsibleMobileSection label="Heutige Zeiten" className="order-7">
          {todayPanel}
        </CollapsibleMobileSection>
      ) : !(isEmployee && cockpitData) ? (
        <div className="order-7">{todayPanel}</div>
      ) : null}

      {/* Business plan CTA */}
      {plan === "STARTER" && (
        <div className="order-8 hidden flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] dark:border-white/10 dark:bg-surface/85 sm:flex-row sm:items-center sm:justify-between sm:p-8 md:flex">
          <div className="min-w-0">
            <p className="text-sm font-semibold">PDF-Export & Lohnbüro-Versand freischalten</p>
            <p className="mt-1 text-xs text-muted-foreground">Upgrade auf Business für vollständige Berichte.</p>
          </div>
          <Link
            href="/dashboard/billing"
            className="btn-brand inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl px-5 text-sm font-bold active:scale-[0.99] sm:w-auto"
          >
            Upgrade
          </Link>
        </div>
      )}
    </div>
  );
}
