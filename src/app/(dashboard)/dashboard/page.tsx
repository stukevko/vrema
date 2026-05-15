import { auth } from "@/auth";
import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { redirect } from "next/navigation";
import { TerminalWidget } from "@/components/dashboard/TerminalWidget";
import { LiveOperationsWidget } from "@/components/dashboard/LiveOperationsWidget";
import { EmployeeCockpit } from "@/components/dashboard/EmployeeCockpit";
import { ActiveShiftTasksCard } from "@/components/dashboard/ActiveShiftTasksCard";
import { HeroStats } from "@/components/dashboard/HeroStats";
import { ComplianceCard } from "@/components/dashboard/ComplianceCard";
import { PredictiveStaffingCard } from "@/components/dashboard/PredictiveStaffingCard";
import { VremaInsightsCard } from "@/components/dashboard/VremaInsightsCard";
import { EmptyTeamBanner } from "@/components/dashboard/EmptyTeamBanner";
import { NoShowCard } from "@/components/dashboard/NoShowCard";
import { getEmployeeCockpitData } from "@/lib/dashboard/employee-cockpit-data";
import { SaldoWidget } from "@/components/dashboard/SaldoWidget";
import { calculateSaldo } from "@/lib/actions/worklogs";
import {
  Users,
  CalendarDays,
  Clock,
  ListChecks,
  TriangleAlert,
  ClipboardCheck,
  ChevronDown,
  Target,
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
import { DashboardAISection } from "@/components/dashboard/DashboardAISection";
import { AsyncAIInsights, AIInsightsSkeleton } from "@/components/dashboard/AsyncAIInsights";
import { queryActiveShiftTasks } from "@/lib/shift-tasks/active-shift-tasks-data";
import { getTodayShiftTaskWall } from "@/lib/shift-tasks/wall";
import { formatBerlinDate, formatBerlinTime, getBerlinNowHour, getDayBoundsUtc } from "@/lib/time/timezone";
import { logServerError } from "@/lib/server-logger";

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
function managerPrimaryFocus(stats: TeamStatsSnapshot) {
  if (stats.absentToday > 0) {
    return {
      title: `${stats.absentToday} fehlende Anwesenheit${stats.absentToday === 1 ? "" : "en"} heute`,
      description: "Prüfen Sie Stempelungen und Abwesenheiten im Team, bevor Sie nachjustieren.",
      href: "/dashboard/reports",
      cta: "Zu den Berichten",
    };
  }
  if (stats.pendingCorrections > 0) {
    return {
      title: `${stats.pendingCorrections} offene Zeitkorrektur${stats.pendingCorrections === 1 ? "" : "en"}`,
      description: "Vorher/Nachher direkt im Bericht prüfen – Freigabe sichert Lohn & Audit.",
      href: "/dashboard/reports#zeitkorrekturen",
      cta: "Diff prüfen",
    };
  }
  if (stats.pendingTradeApprovals > 0) {
    return {
      title: `${stats.pendingTradeApprovals} Schicht-Tausch${stats.pendingTradeApprovals === 1 ? "" : "e"} warten auf Freigabe`,
      description: "Prüfen Sie offene Übernahme-Anfragen, bevor die Schicht startet.",
      href: "/dashboard/planning",
      cta: "Tausch prüfen",
    };
  }
  if (stats.lateToday > 0) {
    return {
      title: `${stats.lateToday} verspätete Ankunft${stats.lateToday === 1 ? "" : "en"} heute`,
      description: "Kurz im Schichtplan oder in den Zeiten gegenprüfen.",
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

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/auth/login");

  const { companyId, id: userId } = session.user as { companyId: string; id: string };
  const plan = session.user.plan ?? "STARTER";
  const role = session.user.role;
  const isSuperAdmin = role === "SUPER_ADMIN" || session.user.id === process.env.SUPER_ADMIN_USER_ID;
  const isManager = role === "COMPANY_OWNER" || role === "MANAGER" || role === "SUPER_ADMIN";
  const isEmployee = role === "EMPLOYEE";

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
      { workedMinutes: 0, expectedMinutes: 0, saldoMinutes: 0 },
    ),
    teamTodayLogsPromise,
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
  const todayWorkedMins = todayLogs.reduce((acc, log) => {
    const end = log.clockOut ?? now;
    return acc + (end.getTime() - log.clockIn.getTime()) / 60000 - log.breakMins;
  }, 0);

  const focus = teamStats ? managerPrimaryFocus(teamStats) : null;

  // Hero-KPI: Personalkosten heute. Wir nutzen den effektiven Brutto-Stundenlohn,
  // ziehen Pausen ab und beziehen offene Schichten bis "jetzt" mit ein.
  const todayPersonnelCostsEuro = (() => {
    if (!teamTodayLogs || teamTodayLogs.length === 0) return 0;
    let totalCents = 0;
    for (const log of teamTodayLogs) {
      const wage = log.user.hourlyWage;
      if (!wage || wage <= 0) continue;
      const end = log.clockOut ?? now;
      const minutes = Math.max(0, (end.getTime() - log.clockIn.getTime()) / 60000 - log.breakMins);
      const hours = minutes / 60;
      totalCents += Math.round(hours * wage * 100);
    }
    return totalCents / 100;
  })();

  const heroAttentionCount = teamStats ? teamStats.absentToday + teamStats.lateToday : 0;
  const heroPendingApprovalsCount = teamStats
    ? teamStats.pendingVacations + teamStats.pendingCorrections + teamStats.pendingTradeApprovals
    : 0;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4 overflow-x-hidden px-4 text-foreground sm:gap-6 sm:px-2 md:gap-8 md:px-0">
      {/* Header — für Mitarbeiter überspringen, weil das Cockpit selbst begrüßt */}
      {!isEmployee && (
        <div className="order-1 min-w-0 shrink-0 rounded-2xl glass-panel p-5 sm:p-8">
          <h1 className="text-base font-bold tracking-tight sm:text-2xl md:text-3xl">
            Guten {berlinHour < 12 ? "Morgen" : berlinHour < 18 ? "Tag" : "Abend"},{" "}
            {session.user.name?.split(" ")[0] ?? "Nutzer"} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {formatBerlinDate(now, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      )}

      {/* Hero-KPIs (Manager) — das "3-Sekunden-Prinzip" direkt unter dem Gruß. */}
      {teamStats && (
        <div className="order-1 mt-1 min-w-0 sm:mt-2">
          <HeroStats
            presentNow={teamStats.activeToday}
            totalEmployees={teamStats.totalEmployees}
            todayPersonnelCostsEuro={todayPersonnelCostsEuro}
            attentionCount={heroAttentionCount}
            attentionBreakdown={{ absent: teamStats.absentToday, late: teamStats.lateToday }}
            pendingApprovalsCount={heroPendingApprovalsCount}
          />
        </div>
      )}

      {/* Empty-State Banner (Owner ohne Team) — niemals „toter" leerer Bildschirm. */}
      {isManager && teamStats && teamStats.totalEmployees <= 1 && (
        <div className="order-1">
          <EmptyTeamBanner teamSize={teamStats.totalEmployees} />
        </div>
      )}

      {/* No-Show-Alarm (Manager) — höchste Priorität, ganz oben sichtbar. */}
      {isManager && (
        <div className="order-1">
          <NoShowCard />
        </div>
      )}

      {/* VREMA Insights — Native Core AI, prominenter Trust-Anker.
          Steht ganz oben (nach No-Show-Alarm), weil sie die zentrale
          „aus deinen eigenen Daten gelernt"-Story trägt. */}
      {isManager && (
        <Suspense fallback={null}>
          <div className="order-1">
            <VremaInsightsCard />
          </div>
        </Suspense>
      )}

      {/* ArbZG-Compliance-Score (Manager) — Premium-Verkaufsargument. */}
      {isManager && (
        <Suspense fallback={null}>
          <div className="order-1">
            <ComplianceCard />
          </div>
        </Suspense>
      )}

      {/* Predictive Staffing (Manager) – Vorwärts gerichtet, nutzt jetzt AiWeights
          mit Heuristik-Fallback bei wenig Trainingsdaten. */}
      {isManager && (
        <Suspense fallback={null}>
          <div className="order-1">
            <PredictiveStaffingCard />
          </div>
        </Suspense>
      )}

      {/* Mitarbeiter: Personal Cockpit – Hero + Stempel + Quick-Stats.
          ID `terminal-widget` migriert hierhin, damit alle Deeplinks („Jetzt einstempeln")
          beim Mitarbeiter direkt auf den großen Stempel-Button springen. */}
      {isEmployee && cockpitData && (
        <div id="terminal-widget" className="order-1 scroll-mt-20">
          <EmployeeCockpit data={cockpitData} firstName={session.user.name?.split(" ")[0] ?? "Hallo"} />
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
            Dein persönliches Cockpit lädt gerade nicht – kein Problem, du kannst weiter unten am Terminal stempeln. Der
            Status synchronisiert sich beim nächsten Reload automatisch.
          </p>
        </div>
      )}

      {/* Aufgaben prominent: nur sichtbar, wenn eingestempelt + Liste vorhanden */}
      {activeLog && shiftTasksPayload && shiftTasksPayload.items.length > 0 ? (
        <div className="order-2">
          <ActiveShiftTasksCard tasks={shiftTasksPayload} />
        </div>
      ) : null}

      {isSuperAdmin && superAdminCompanies && superAdminMonitoring && (
        <div className="order-3">
          <SuperAdminInlinePanel companies={superAdminCompanies} monitoring={superAdminMonitoring} />
        </div>
      )}

      {employeeCount === 0 && (
        <div className="order-4 rounded-2xl glass-panel p-5 sm:p-8">
          <div className="flex items-center gap-2 mb-2">
            <ListChecks className="w-4 h-4 text-brand" />
            <p className="font-semibold text-sm">Noch kein Team angelegt</p>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            Starten Sie mit einem klaren Setup und aktivieren Sie anschliessend das Terminal für den ersten Testlauf.
          </p>
          <ol className="list-decimal pl-5 text-sm text-foreground space-y-1">
            <li>
              <Link href="/dashboard/team" className="text-brand hover:underline">
                Mitarbeiter anlegen
              </Link>
            </li>
            <li>
              <a href="#terminal-widget" className="text-brand hover:underline">
                Terminal testen
              </a>
            </li>
          </ol>
        </div>
      )}

      {/* Team stats (for owners/managers) — Fokus-Karte + Details für Kennzahlen */}
      {teamStats && focus && (
        <div className="order-5 min-w-0 space-y-4 md:order-4">
          <div className="glass-card border-brand/25 bg-gradient-to-br from-brand/14 via-surface/30 to-transparent p-5 sm:p-6 dark:from-brand/18 dark:via-surface/20">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-brand-soft text-brand shadow-sm dark:border-white/10 dark:bg-brand/22 dark:text-brand-foreground">
                <Target className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-brand">Heute im Fokus</p>
                <h2 className="text-base font-bold tracking-tight text-fg sm:text-lg">{focus.title}</h2>
                <p className="text-sm text-fg-muted">{focus.description}</p>
                <Link
                  href={focus.href + (focus.href === "/dashboard/planning" && teamStats.pendingTradeApprovals > 0 ? "#shift-trade-approvals" : "")}
                  className="btn-brand inline-flex min-h-11 items-center justify-center rounded-2xl px-4 text-sm font-bold active:scale-[0.99]"
                >
                  {focus.cta}
                </Link>
              </div>
            </div>
          </div>

          <LiveOperationsWidget rows={liveOpsRows} />

          {teamStats.pendingTradeApprovals > 0 && (
            <Link
              href="/dashboard/planning#shift-trade-approvals"
              className="block rounded-2xl border border-warning/30 bg-warning-soft px-5 py-4 shadow-sm transition-[background-color,border-color,box-shadow] duration-150 hover:border-warning/45 hover:shadow-[var(--shadow-card-hover)] active:brightness-95 dark:border-white/10 dark:bg-warning/18"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-warning-foreground">Offene Aufgaben</p>
              <p className="mt-1 text-base font-bold text-warning-foreground">
                {teamStats.pendingTradeApprovals} Tauschanfragen warten auf deine Freigabe
              </p>
            </Link>
          )}
          {teamStats.pendingCorrections > 0 && (
            <Link
              href="/dashboard/reports#zeitkorrekturen"
              className="block rounded-2xl border border-brand/28 bg-brand-soft px-5 py-4 shadow-sm transition-[background-color,border-color,box-shadow] duration-150 hover:border-brand/40 hover:shadow-[var(--shadow-card-hover)] active:brightness-95 dark:border-white/10 dark:bg-brand/22"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-brand">Compliance · Zeitkorrekturen</p>
              <p className="mt-1 text-base font-bold text-brand dark:text-brand-foreground">
                {teamStats.pendingCorrections} {teamStats.pendingCorrections === 1 ? "Antrag" : "Anträge"} mit Vorher/Nachher prüfen
              </p>
              <p className="mt-1 text-xs text-fg-muted">Direkt zum Diff-Block in den Berichten – kein Suchen.</p>
            </Link>
          )}

          <details className="group rounded-2xl glass-panel">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-left marker:content-none [&::-webkit-details-marker]:hidden">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Details</p>
                <p className="text-sm font-semibold text-foreground">Team & Kennzahlen anzeigen</p>
              </div>
              <ChevronDown
                className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="space-y-4 border-t border-border px-5 pb-5 pt-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Kurzzugriff</p>
                  <p className="mt-1 text-sm text-muted-foreground">Häufig genutzte Bereiche</p>
                </div>
                <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:max-w-md sm:grid-cols-3">
                  <Link
                    href="/dashboard/planning"
                    className="flex min-h-12 items-center justify-center rounded-2xl border border-border px-4 text-sm font-medium text-foreground transition-all active:scale-[0.99] md:hover:bg-card/70"
                  >
                    Wochenplan
                  </Link>
                  <Link
                    href="/dashboard/reports"
                    className="flex min-h-12 items-center justify-center rounded-2xl border border-border px-4 text-sm font-medium text-foreground transition-all active:scale-[0.99] md:hover:bg-card/70"
                  >
                    Zeiten
                  </Link>
                  <Link
                    href="/dashboard/vacation"
                    className="flex min-h-12 items-center justify-center rounded-2xl border border-border px-4 text-sm font-medium text-foreground transition-all active:scale-[0.99] md:hover:bg-card/70"
                  >
                    Urlaub
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-line bg-surface px-3 py-2 shadow-[var(--shadow-card)] dark:border-white/10 dark:bg-surface/85">
                  <span className="text-muted-foreground">Fehlend heute</span>
                  <p className={`mt-1 font-semibold ${teamStats.absentToday > 0 ? "text-danger" : "text-brand"}`}>
                    {teamStats.absentToday > 0 ? `${teamStats.absentToday} kritisch` : "Keine offenen Ausfälle"}
                  </p>
                </div>
                <div className="rounded-2xl border border-line bg-surface px-3 py-2 shadow-[var(--shadow-card)] dark:border-white/10 dark:bg-surface/85">
                  <span className="text-muted-foreground">Zu spät heute</span>
                  <p className={`mt-1 font-semibold ${teamStats.lateToday > 0 ? "text-warning" : "text-brand"}`}>
                    {teamStats.lateToday > 0 ? `${teamStats.lateToday} Hinweise` : "Alles pünktlich"}
                  </p>
                </div>
                {teamStats.pendingCorrections > 0 ? (
                  <Link
                    href="/dashboard/reports#zeitkorrekturen"
                    className="block rounded-2xl border border-line bg-surface px-3 py-2 shadow-[var(--shadow-card)] transition-colors duration-150 hover:border-brand/40 hover:bg-card/80 dark:border-white/10 dark:bg-surface/85"
                  >
                    <span className="text-muted-foreground">Unbestätigte Zeiten</span>
                    <p className="mt-1 font-semibold text-warning">
                      {teamStats.pendingCorrections} offen · Diff prüfen →
                    </p>
                  </Link>
                ) : (
                  <div className="rounded-2xl border border-line bg-surface px-3 py-2 shadow-[var(--shadow-card)] dark:border-white/10 dark:bg-surface/85">
                    <span className="text-muted-foreground">Unbestätigte Zeiten</span>
                    <p className="mt-1 font-semibold text-brand">Keine offenen Korrekturen</p>
                  </div>
                )}
              </div>
              <div className="min-w-0 max-w-full overflow-x-clip md:overflow-visible">
                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-visible pb-2 pt-1 scrollbar-hide md:grid md:snap-none md:grid-cols-2 md:gap-4 md:overflow-visible md:pb-0 md:pt-0 xl:grid-cols-3 2xl:grid-cols-6">
                {(
                  [
                    { label: "Mitarbeiter gesamt", value: teamStats.totalEmployees, icon: Users, iconClass: "text-brand", valueClass: "text-brand", href: "/dashboard/team" },
                    { label: "Heute aktiv", value: teamStats.activeToday, icon: Clock, iconClass: "text-brand", valueClass: "text-brand", href: "/dashboard/reports" },
                    { label: "Urlaubsanträge", value: teamStats.pendingVacations, icon: CalendarDays, iconClass: "text-warning", valueClass: "text-warning", href: "/dashboard/vacation#team-vacation-requests", actionable: teamStats.pendingVacations > 0 ? "Mit Resturlaub & Konflikten prüfen" : undefined },
                    { label: "Fehlend heute", value: teamStats.absentToday, icon: TriangleAlert, iconClass: "text-danger", valueClass: "text-danger", href: "/dashboard/reports" },
                    { label: "Zu spät heute", value: teamStats.lateToday, icon: TriangleAlert, iconClass: "text-warning", valueClass: "text-warning", href: "/dashboard/planning" },
                    { label: "Offene Zeitfreigaben", value: teamStats.pendingCorrections, icon: ClipboardCheck, iconClass: "text-brand", valueClass: "text-brand", href: "/dashboard/reports#zeitkorrekturen", actionable: teamStats.pendingCorrections > 0 ? "Diff prüfen" : undefined },
                  ] as Array<{
                    label: string;
                    value: number;
                    icon: typeof Users;
                    iconClass: string;
                    valueClass: string;
                    href?: string;
                    actionable?: string;
                  }>
                ).map((stat) => {
                  const inner = (
                    <>
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                        <stat.icon className={`h-4 w-4 ${stat.iconClass}`} />
                      </div>
                      <p className={`min-w-0 max-w-full text-[clamp(1.25rem,5vw,1.875rem)] font-bold leading-tight tabular-nums ${stat.valueClass}`}>
                        {stat.value}
                      </p>
                      {stat.actionable ? (
                        <p className="mt-1 text-[11px] font-semibold text-foreground/80">
                          {stat.actionable} →
                        </p>
                      ) : null}
                    </>
                  );
                  const baseClass =
                    "w-[calc(100%-0.5rem)] max-w-[min(100%,20rem)] shrink-0 snap-center rounded-2xl glass-panel p-5 transition-all max-[380px]:w-full sm:p-6 md:w-auto md:max-w-none md:min-w-0";
                  if (stat.href && stat.value > 0) {
                    return (
                      <Link
                        key={stat.label}
                        href={stat.href}
                        className={`${baseClass} block hover:border-brand/35 hover:bg-card/80 active:brightness-95`}
                      >
                        {inner}
                      </Link>
                    );
                  }
                  return (
                    <div
                      key={stat.label}
                      className={`${baseClass} md:hover:bg-card/80`}
                    >
                      {inner}
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          </details>
        </div>
      )}

      {/* Main grid: Mobil Terminal → Saldo → AI; Desktop gleiche Reihenfolge im Grid.
          Für Mitarbeiter NORMALERWEISE keine TerminalWidget – sie haben oben den BigClockButton.
          Ausnahme: wenn das Cockpit fehlschlägt, brauchen sie irgendeinen Stempel-Weg → wir
          fallback-zeigen das TerminalWidget. */}
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
            hasWorkLogs={Boolean(hasAnyWorkLog)}
          />
        </div>
        <div className="order-3 md:order-3">
          <DashboardAISection>
            <Suspense fallback={<AIInsightsSkeleton />}>
              <AsyncAIInsights companyId={companyId} />
            </Suspense>
          </DashboardAISection>
        </div>
      </div>

      {/* Today summary */}
      <div className="order-7 rounded-2xl glass-panel p-5 transition-all sm:p-8 md:hover:bg-card/80">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold">Heute</h2>
            <span className="text-sm text-brand tabular-nums font-bold">
              {Math.floor(todayWorkedMins / 60)}h {Math.floor(todayWorkedMins % 60).toString().padStart(2, "0")}m
            </span>
          </div>
          {/* Sekundäre Aktionen kompakt im Drei-Punkte-Menü statt im Header-Lärm. */}
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
        </div>

        {todayLogs.length === 0 ? (
          <EmptyState
            tone="celebrate"
            icon={PartyPopper}
            title="Noch kein Zeiteintrag für heute"
            description="Drück den großen Stempel-Button im Terminal-Widget oben, um den Tag zu starten."
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
                <div key={log.id} className="flex min-h-[3.25rem] items-center justify-between gap-3 rounded-2xl bg-background px-3 py-3 sm:py-2.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${log.clockOut ? "bg-muted-foreground/30" : "bg-brand animate-pulse"}`} />
                    <span className="text-sm text-foreground">
                      {formatBerlinTime(new Date(log.clockIn), { hour: "2-digit", minute: "2-digit" })}
                      {" — "}
                      {log.clockOut
                        ? formatBerlinTime(new Date(log.clockOut), { hour: "2-digit", minute: "2-digit" })
                        : "läuft..."}
                    </span>
                  </div>
                  {durationMins !== null && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {Math.floor(durationMins / 60)}h {Math.floor(durationMins % 60).toString().padStart(2, "0")}m
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Business plan CTA */}
      {plan === "STARTER" && (
        <div className="order-8 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] dark:border-white/10 dark:bg-surface/85 sm:flex-row sm:items-center sm:justify-between sm:p-8">
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
