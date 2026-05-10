import { auth } from "@/auth";
import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { redirect } from "next/navigation";
import { TerminalWidget } from "@/components/dashboard/TerminalWidget";
import { LiveOperationsWidget } from "@/components/dashboard/LiveOperationsWidget";
import { EmployeeCockpit } from "@/components/dashboard/EmployeeCockpit";
import { ActiveShiftTasksCard } from "@/components/dashboard/ActiveShiftTasksCard";
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
} from "lucide-react";
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

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-1 text-foreground sm:gap-6 sm:px-2 md:gap-8 md:px-0">
      {/* Header — für Mitarbeiter überspringen, weil das Cockpit selbst begrüßt */}
      {!isEmployee && (
        <div className="order-1 shrink-0 rounded-2xl glass-panel p-5 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Guten {berlinHour < 12 ? "Morgen" : berlinHour < 18 ? "Tag" : "Abend"},{" "}
            {session.user.name?.split(" ")[0] ?? "Nutzer"} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {formatBerlinDate(now, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
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
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
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
            <ListChecks className="w-4 h-4 text-primary" />
            <p className="font-semibold text-sm">Noch kein Team angelegt</p>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            Starten Sie mit einem klaren Setup und aktivieren Sie anschliessend das Terminal für den ersten Testlauf.
          </p>
          <ol className="list-decimal pl-5 text-sm text-foreground space-y-1">
            <li>
              <Link href="/dashboard/team" className="text-primary hover:underline">
                Mitarbeiter anlegen
              </Link>
            </li>
            <li>
              <a href="#terminal-widget" className="text-primary hover:underline">
                Terminal testen
              </a>
            </li>
          </ol>
        </div>
      )}

      {/* Team stats (for owners/managers) — Fokus-Karte + Details für Kennzahlen */}
      {teamStats && focus && (
        <div className="order-5 space-y-4 md:order-4">
          <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Target className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">Heute im Fokus</p>
                <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">{focus.title}</h2>
                <p className="text-sm text-muted-foreground">{focus.description}</p>
                <Link
                  href={focus.href + (focus.href === "/dashboard/planning" && teamStats.pendingTradeApprovals > 0 ? "#shift-trade-approvals" : "")}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-bold text-foreground ring-1 ring-inset ring-white/20 transition-colors hover:bg-primary/90 active:scale-[0.99]"
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
              className="block rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 shadow-sm transition-colors hover:bg-amber-100/70"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-700">Offene Aufgaben</p>
              <p className="mt-1 text-base font-bold text-amber-900">
                {teamStats.pendingTradeApprovals} Tauschanfragen warten auf deine Freigabe
              </p>
            </Link>
          )}
          {teamStats.pendingCorrections > 0 && (
            <Link
              href="/dashboard/reports#zeitkorrekturen"
              className="block rounded-2xl border border-violet-300 bg-violet-50 px-5 py-4 shadow-sm transition-colors hover:bg-violet-100/70"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-700">Compliance · Zeitkorrekturen</p>
              <p className="mt-1 text-base font-bold text-violet-900">
                {teamStats.pendingCorrections} {teamStats.pendingCorrections === 1 ? "Antrag" : "Anträge"} mit Vorher/Nachher prüfen
              </p>
              <p className="mt-1 text-xs text-violet-700">Direkt zum Diff-Block in den Berichten – kein Suchen.</p>
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
                <div className="rounded-2xl border border-border bg-card px-3 py-2 shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-xl">
                  <span className="text-muted-foreground">Fehlend heute</span>
                  <p className={`mt-1 font-semibold ${teamStats.absentToday > 0 ? "text-red-700" : "text-emerald-700"}`}>
                    {teamStats.absentToday > 0 ? `${teamStats.absentToday} kritisch` : "Keine offenen Ausfälle"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-card px-3 py-2 shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-xl">
                  <span className="text-muted-foreground">Zu spät heute</span>
                  <p className={`mt-1 font-semibold ${teamStats.lateToday > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                    {teamStats.lateToday > 0 ? `${teamStats.lateToday} Hinweise` : "Alles pünktlich"}
                  </p>
                </div>
                {teamStats.pendingCorrections > 0 ? (
                  <Link
                    href="/dashboard/reports#zeitkorrekturen"
                    className="block rounded-2xl border border-border bg-card px-3 py-2 shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-colors hover:border-primary/40 hover:bg-card/80"
                  >
                    <span className="text-muted-foreground">Unbestätigte Zeiten</span>
                    <p className="mt-1 font-semibold text-amber-700">
                      {teamStats.pendingCorrections} offen · Diff prüfen →
                    </p>
                  </Link>
                ) : (
                  <div className="rounded-2xl border border-border bg-card px-3 py-2 shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-xl">
                    <span className="text-muted-foreground">Unbestätigte Zeiten</span>
                    <p className="mt-1 font-semibold text-emerald-700">Keine offenen Korrekturen</p>
                  </div>
                )}
              </div>
              <div className="-mx-2 flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-visible pb-2 pt-1 scrollbar-hide md:mx-0 md:grid md:snap-none md:grid-cols-2 md:gap-4 md:overflow-visible md:pb-0 md:pt-0 xl:grid-cols-3 2xl:grid-cols-6">
                {(
                  [
                    { label: "Mitarbeiter gesamt", value: teamStats.totalEmployees, icon: Users, color: "#60a5fa", href: "/dashboard/team" },
                    { label: "Heute aktiv", value: teamStats.activeToday, icon: Clock, color: "#86efac", href: "/dashboard/reports" },
                    { label: "Urlaubsanträge", value: teamStats.pendingVacations, icon: CalendarDays, color: "#f59e0b", href: "/dashboard/vacation#team-vacation-requests", actionable: teamStats.pendingVacations > 0 ? "Mit Resturlaub & Konflikten prüfen" : undefined },
                    { label: "Fehlend heute", value: teamStats.absentToday, icon: TriangleAlert, color: "#f87171", href: "/dashboard/reports" },
                    { label: "Zu spät heute", value: teamStats.lateToday, icon: TriangleAlert, color: "#fbbf24", href: "/dashboard/planning" },
                    { label: "Offene Zeitfreigaben", value: teamStats.pendingCorrections, icon: ClipboardCheck, color: "#c084fc", href: "/dashboard/reports#zeitkorrekturen", actionable: teamStats.pendingCorrections > 0 ? "Diff prüfen" : undefined },
                  ] as Array<{
                    label: string;
                    value: number;
                    icon: typeof Users;
                    color: string;
                    href?: string;
                    actionable?: string;
                  }>
                ).map((stat) => {
                  const inner = (
                    <>
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                        <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                      </div>
                      <p className="text-3xl font-bold" style={{ color: stat.color }}>
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
                    "w-[min(88vw,20rem)] shrink-0 snap-center rounded-2xl glass-panel p-5 transition-all sm:p-6 md:w-auto md:min-w-0";
                  if (stat.href && stat.value > 0) {
                    return (
                      <Link
                        key={stat.label}
                        href={stat.href}
                        className={`${baseClass} block hover:border-primary/40 hover:bg-card/80 active:scale-[0.99]`}
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
          <h2 className="font-semibold">Heute</h2>
          <span className="text-sm text-primary tabular-nums font-bold">
            {Math.floor(todayWorkedMins / 60)}h {Math.floor(todayWorkedMins % 60).toString().padStart(2, "0")}m
          </span>
        </div>

        {todayLogs.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">Noch kein Zeiteintrag für heute. Sie können jetzt den ersten Eintrag erfassen.</p>
            <Link
              href="#terminal-widget"
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-border px-4 text-sm font-medium text-foreground transition-all active:scale-[0.99] sm:w-auto md:hover:bg-card/80"
            >
              Jetzt einstempeln
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {todayLogs.map((log) => {
              const durationMins = log.clockOut
                ? (log.clockOut.getTime() - log.clockIn.getTime()) / 60000 - log.breakMins
                : null;
              return (
                <div key={log.id} className="flex min-h-[3.25rem] items-center justify-between gap-3 rounded-2xl bg-background px-3 py-3 sm:py-2.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${log.clockOut ? "bg-muted-foreground/30" : "bg-primary animate-pulse"}`} />
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
        <div className="order-8 flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="min-w-0">
            <p className="text-sm font-semibold">PDF-Export & Lohnbüro-Versand freischalten</p>
            <p className="mt-1 text-xs text-muted-foreground">Upgrade auf Business für vollständige Berichte.</p>
          </div>
          <Link
            href="/dashboard/billing"
            className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-bold text-foreground ring-1 ring-inset ring-white/20 transition-all active:scale-[0.99] md:hover:bg-primary/90 sm:w-auto"
          >
            Upgrade
          </Link>
        </div>
      )}
    </div>
  );
}
