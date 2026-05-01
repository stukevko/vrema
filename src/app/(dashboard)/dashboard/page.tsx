import { auth } from "@/auth";
import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { redirect } from "next/navigation";
import { TerminalWidget } from "@/components/dashboard/TerminalWidget";
import { SaldoWidget } from "@/components/dashboard/SaldoWidget";
import { calculateSaldo } from "@/lib/actions/worklogs";
import { Users, CalendarDays, Clock, ListChecks, TriangleAlert, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { CorrectionRequestStatus, EntryStatus, UserRole, VacationStatus } from "@prisma/client";
import { getSuperAdminMonitoring, getSuperAdminOverview } from "@/lib/actions/super-admin";
import { SuperAdminInlinePanel } from "@/components/dashboard/SuperAdminInlinePanel";

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

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 text-foreground">
      {/* Header */}
      <div className="rounded-3xl border border-border bg-card backdrop-blur-xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
        <h1 className="text-2xl font-semibold tracking-tight">
          Guten {new Date().getHours() < 12 ? "Morgen" : new Date().getHours() < 18 ? "Tag" : "Abend"},{" "}
          {session.user.name?.split(" ")[0] ?? "Nutzer"} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString("de-DE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {isSuperAdmin && superAdminCompanies && superAdminMonitoring && (
        <SuperAdminInlinePanel companies={superAdminCompanies} monitoring={superAdminMonitoring} />
      )}

      {employeeCount === 0 && (
        <div className="rounded-3xl border border-border bg-card backdrop-blur-xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-2 mb-2">
            <ListChecks className="w-4 h-4 text-primary" />
            <p className="font-semibold text-sm">Erste Schritte</p>
          </div>
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

      {/* Team stats (for owners/managers) */}
      {teamStats && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-card backdrop-blur-xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Command Center</p>
                <h2 className="text-sm font-semibold tracking-tight mt-1">Heute im Blick: Live-Status und offene Aufgaben</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/dashboard/planning" className="rounded-2xl border border-border px-4 py-2 text-xs text-foreground md:hover:bg-card/70 transition-all active:scale-95">
                  Wochenplan prüfen
                </Link>
                <Link href="/dashboard/reports" className="rounded-2xl border border-border px-4 py-2 text-xs text-foreground md:hover:bg-card/70 transition-all active:scale-95">
                  Zeiten prüfen
                </Link>
                <Link href="/dashboard/vacation" className="rounded-2xl border border-border px-4 py-2 text-xs text-foreground md:hover:bg-card/70 transition-all active:scale-95">
                  Anträge öffnen
                </Link>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3 text-xs">
              <div className="rounded-2xl bg-card backdrop-blur-xl border border-border shadow-[0_20px_50px_rgba(0,0,0,0.05)] px-3 py-2">
                <span className="text-muted-foreground">Fehlend heute</span>
                <p className={`mt-1 font-semibold ${teamStats.absentToday > 0 ? "text-red-200" : "text-emerald-200"}`}>
                  {teamStats.absentToday > 0 ? `${teamStats.absentToday} kritisch` : "Keine offenen Ausfälle"}
                </p>
              </div>
              <div className="rounded-2xl bg-card backdrop-blur-xl border border-border shadow-[0_20px_50px_rgba(0,0,0,0.05)] px-3 py-2">
                <span className="text-muted-foreground">Zu spät heute</span>
                <p className={`mt-1 font-semibold ${teamStats.lateToday > 0 ? "text-amber-200" : "text-emerald-200"}`}>
                  {teamStats.lateToday > 0 ? `${teamStats.lateToday} Hinweise` : "Alles pünktlich"}
                </p>
              </div>
              <div className="rounded-2xl bg-card backdrop-blur-xl border border-border shadow-[0_20px_50px_rgba(0,0,0,0.05)] px-3 py-2">
                <span className="text-muted-foreground">Unbestätigte Zeiten</span>
                <p className={`mt-1 font-semibold ${teamStats.pendingCorrections > 0 ? "text-amber-200" : "text-emerald-200"}`}>
                  {teamStats.pendingCorrections > 0 ? `${teamStats.pendingCorrections} offen` : "Keine offenen Korrekturen"}
                </p>
              </div>
            </div>
          </div>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          {[
            { label: "Mitarbeiter gesamt", value: teamStats.totalEmployees, icon: Users, color: "#60a5fa" },
            { label: "Heute aktiv", value: teamStats.activeToday, icon: Clock, color: "#86efac" },
            { label: "Urlaubsanträge", value: teamStats.pendingVacations, icon: CalendarDays, color: "#f59e0b" },
            { label: "Fehlend heute", value: teamStats.absentToday, icon: TriangleAlert, color: "#f87171" },
            { label: "Zu spät heute", value: teamStats.lateToday, icon: TriangleAlert, color: "#fbbf24" },
            { label: "Offene Zeitfreigaben", value: teamStats.pendingCorrections, icon: ClipboardCheck, color: "#c084fc" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-3xl bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all md:hover:bg-card/80">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <p className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
        {/* Terminal */}
        <div id="terminal-widget">
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
            gpsRequired={plan === "BUSINESS" && role === "EMPLOYEE"}
            gpsFeatureEnabled={plan !== "STARTER"}
          />
        </div>

        {/* Saldo */}
        <SaldoWidget
          workedMinutes={saldo.workedMinutes}
          expectedMinutes={saldo.expectedMinutes}
          saldoMinutes={saldo.saldoMinutes}
          hasWorkLogs={Boolean(hasAnyWorkLog)}
        />
      </div>

      {/* Today summary */}
      <div className="rounded-3xl bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all md:hover:bg-card/80">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Heute</h2>
          <span className="text-sm text-primary tabular-nums font-bold">
            {Math.floor(todayWorkedMins / 60)}h {Math.floor(todayWorkedMins % 60).toString().padStart(2, "0")}m
          </span>
        </div>

        {todayLogs.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">Alles ruhig hier. Genieße die Pause! ☕</p>
            <Link
              href="#terminal-widget"
              className="mt-3 inline-flex items-center rounded-2xl border border-border px-4 py-2 text-sm text-foreground transition-all active:scale-95 md:hover:bg-card/80"
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
                <div key={log.id} className="flex items-center justify-between py-2.5 px-3 rounded-2xl bg-background">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${log.clockOut ? "bg-white/20" : "bg-primary animate-pulse"}`} />
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
        <div className="rounded-3xl bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl p-8 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
          <div>
            <p className="font-semibold text-sm">PDF-Export & Lohnbüro-Versand freischalten</p>
            <p className="text-xs text-muted-foreground mt-1">Upgrade auf Business für vollständige Berichte.</p>
          </div>
          <Link
            href="/dashboard/billing"
            className="shrink-0 px-4 py-2 rounded-2xl bg-primary text-black text-sm font-bold ring-1 ring-inset ring-white/20 md:hover:bg-primary/90 transition-all active:scale-95"
          >
            Upgrade
          </Link>
        </div>
      )}
    </div>
  );
}
