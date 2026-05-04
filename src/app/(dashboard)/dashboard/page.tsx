import { auth } from "@/auth";
import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { redirect } from "next/navigation";
import { TerminalWidget } from "@/components/dashboard/TerminalWidget";
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
  LogIn,
} from "lucide-react";
import Link from "next/link";
import { CorrectionRequestStatus, EntryStatus, UserRole, VacationStatus } from "@prisma/client";
import { getSuperAdminMonitoring, getSuperAdminOverview } from "@/lib/actions/super-admin";
import { SuperAdminInlinePanel } from "@/components/dashboard/SuperAdminInlinePanel";
import { AIInsights } from "@/components/dashboard/AIInsights";
import { DashboardAISection } from "@/components/dashboard/DashboardAISection";

type TeamStatsSnapshot = {
  totalEmployees: number;
  activeToday: number;
  pendingVacations: number;
  absentToday: number;
  lateToday: number;
  pendingCorrections: number;
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
      description: "Freigaben sichern die Nachvollziehbarkeit für Lohn und Prüfung.",
      href: "/dashboard/reports",
      cta: "Korrekturen prüfen",
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
      description: "Schnelle Entscheidungen entlasten Ihr Team.",
      href: "/dashboard/vacation",
      cta: "Anträge bearbeiten",
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
  const [employeeCount, hasAnyWorkLog] = await Promise.all([
    db.user.count({
      where: tenantWhere(companyId, {
        isActive: true,
        role: { in: ["MANAGER", "EMPLOYEE"] as UserRole[] },
      }),
    }),
    db.workLog.findFirst({
      where: tenantWhere(companyId, { userId }),
      select: { id: true },
    }),
  ]);


  // Active clock-in
  const activeLog = await db.workLog.findFirst({
    where: tenantWhere(companyId, { userId, clockOut: null }),
    select: {
      id: true,
      clockIn: true,
      breakMins: true,
      isOnBreak: true,
      breakStartedAt: true,
    },
  });

  // Today's work logs
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayLogs = await db.workLog.findMany({
    where: tenantWhere(companyId, { userId, clockIn: { gte: today } }),
    orderBy: { clockIn: "desc" },
  });

  // Team stats (for owner/manager)
  const role = session.user.role;
  const isSuperAdmin = role === "SUPER_ADMIN" || session.user.id === process.env.SUPER_ADMIN_USER_ID;
  let teamStats = null;
  if (role === "COMPANY_OWNER" || role === "MANAGER" || role === "SUPER_ADMIN") {
    const [totalEmployees, activeToday, pendingVacations, absentToday, lateToday, pendingCorrections] = await Promise.all([
      db.user.count({ where: tenantWhere(companyId, { isActive: true }) }),
      db.workLog.count({ where: tenantWhere(companyId, { clockIn: { gte: today }, clockOut: null }) }),
      db.vacationRequest.count({ where: tenantWhere(companyId, { status: VacationStatus.PENDING }) }),
      db.workLog.count({ where: tenantWhere(companyId, { clockIn: { gte: today }, status: EntryStatus.ABSENT }) }),
      db.workLog.count({ where: tenantWhere(companyId, { clockIn: { gte: today }, status: EntryStatus.LATE }) }),
      db.workLogCorrectionRequest.count({
        where: tenantWhere(companyId, { status: CorrectionRequestStatus.PENDING }),
      }),
    ]);
    teamStats = {
      totalEmployees,
      activeToday,
      pendingVacations,
      absentToday,
      lateToday,
      pendingCorrections,
    };
  }

  const [superAdminCompanies, superAdminMonitoring] = isSuperAdmin
    ? await Promise.all([getSuperAdminOverview(), getSuperAdminMonitoring()])
    : [null, null];

  // Saldo
  const saldo = await calculateSaldo(userId);

  // Today's worked time
  const todayWorkedMins = todayLogs.reduce((acc, log) => {
    const end = log.clockOut ?? new Date();
    return acc + (end.getTime() - log.clockIn.getTime()) / 60000 - log.breakMins;
  }, 0);

  const focus = teamStats ? managerPrimaryFocus(teamStats) : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 px-2 text-foreground sm:gap-6 sm:px-0 md:gap-8 md:px-0">
      {/* Header */}
      <div className="order-1 shrink-0 rounded-2xl glass-panel p-5 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Guten {new Date().getHours() < 12 ? "Morgen" : new Date().getHours() < 18 ? "Tag" : "Abend"},{" "}
          {session.user.name?.split(" ")[0] ?? "Nutzer"} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString("de-DE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Mitarbeiter: eine klare Primäraktion vor dem restlichen Dashboard */}
      {role === "EMPLOYEE" && (
        <div className="order-2 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <LogIn className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">Jetzt stempeln</p>
              {activeLog ? (
                <>
                  <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">Sie sind eingestempelt</h2>
                  <p className="text-sm text-muted-foreground">
                    Pausen und Arbeitsende buchen Sie direkt im Terminal unten — ohne Umwege.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">Arbeitsbeginn erfassen</h2>
                  <p className="text-sm text-muted-foreground">
                    Tippen Sie im Terminal auf Einstempeln. Der Status erscheint sofort, die Buchung läuft im Hintergrund.
                  </p>
                </>
              )}
              <a
                href="#terminal-widget"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-bold text-foreground ring-1 ring-inset ring-white/20 transition-colors hover:bg-primary/90 active:scale-[0.99]"
              >
                Zum Terminal
              </a>
            </div>
          </div>
        </div>
      )}

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
                  href={focus.href}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-bold text-foreground ring-1 ring-inset ring-white/20 transition-colors hover:bg-primary/90 active:scale-[0.99]"
                >
                  {focus.cta}
                </Link>
              </div>
            </div>
          </div>

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
                <div className="rounded-2xl border border-border bg-card px-3 py-2 shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-xl">
                  <span className="text-muted-foreground">Unbestätigte Zeiten</span>
                  <p className={`mt-1 font-semibold ${teamStats.pendingCorrections > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                    {teamStats.pendingCorrections > 0 ? `${teamStats.pendingCorrections} offen` : "Keine offenen Korrekturen"}
                  </p>
                </div>
              </div>
              <div className="-mx-2 flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-visible pb-2 pt-1 scrollbar-hide md:mx-0 md:grid md:snap-none md:grid-cols-2 md:gap-4 md:overflow-visible md:pb-0 md:pt-0 xl:grid-cols-3 2xl:grid-cols-6">
                {[
                  { label: "Mitarbeiter gesamt", value: teamStats.totalEmployees, icon: Users, color: "#60a5fa" },
                  { label: "Heute aktiv", value: teamStats.activeToday, icon: Clock, color: "#86efac" },
                  { label: "Urlaubsanträge", value: teamStats.pendingVacations, icon: CalendarDays, color: "#f59e0b" },
                  { label: "Fehlend heute", value: teamStats.absentToday, icon: TriangleAlert, color: "#f87171" },
                  { label: "Zu spät heute", value: teamStats.lateToday, icon: TriangleAlert, color: "#fbbf24" },
                  { label: "Offene Zeitfreigaben", value: teamStats.pendingCorrections, icon: ClipboardCheck, color: "#c084fc" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="w-[min(88vw,20rem)] shrink-0 snap-center rounded-2xl glass-panel p-5 transition-all sm:p-6 md:w-auto md:min-w-0 md:hover:bg-card/80"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                    </div>
                    <p className="text-3xl font-bold" style={{ color: stat.color }}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </details>
        </div>
      )}

      {/* Main grid: Mobil Terminal → Saldo → AI; Desktop gleiche Reihenfolge im Grid */}
      <div className="order-6 flex flex-col gap-5 md:order-5 md:grid md:grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
        <div id="terminal-widget" className="order-1 md:order-1">
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
            <AIInsights />
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
                      {new Date(log.clockIn).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                      {" — "}
                      {log.clockOut
                        ? new Date(log.clockOut).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
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
