import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMyVacationRequests, getTeamVacationRequestsWithContext } from "@/lib/actions/vacation";
import { VacationList } from "@/components/dashboard/VacationList";
import { VacationRequestForm } from "@/components/dashboard/VacationRequestForm";
import { TeamVacationSection } from "@/components/dashboard/TeamVacationSection";
import { TeamAbsencesSection } from "@/components/dashboard/TeamAbsencesSection";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { CalendarDays } from "lucide-react";

export default async function VacationPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/auth/login");

  const role = session.user.role ?? "EMPLOYEE";
  const isManager = ["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role);
  const companyId = session.user.companyId;

  const [myRequests, teamRequests] = await Promise.all([
    getMyVacationRequests(),
    isManager ? getTeamVacationRequestsWithContext() : Promise.resolve([]),
  ]);

  const pendingTeamCount = teamRequests.filter((r) => r.status === "PENDING").length;

  return (
    <DashboardPageShell maxWidth="5xl" className="sm:space-y-8">
      <DashboardPageHeader
        variant="card"
        icon={CalendarDays}
        eyebrow="Abwesenheit"
        title="Urlaub & Abwesenheit"
        description="Anträge stellen, verwalten und als Führungskraft freigeben."
        badge={
          isManager && pendingTeamCount > 0 ? (
            <p className="inline-flex items-center gap-2 rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning-foreground">
              {pendingTeamCount} {pendingTeamCount === 1 ? "Antrag" : "Anträge"} warten auf Entscheidung
            </p>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="min-w-0">
          <VacationRequestForm />
        </div>
        <div className="min-w-0 space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)] dark:border-white/10 dark:bg-surface/90 sm:p-8">
          <h2 className="font-semibold tracking-tight">Meine Anträge</h2>
          <VacationList requests={myRequests} canApprove={false} />
        </div>
      </div>

      {isManager && teamRequests.length > 0 ? (
        <TeamVacationSection
          rows={teamRequests.map((r) => ({
            id: r.id,
            absenceType: (r.absenceType as "VACATION" | "SICK" | "OTHER" | undefined) ?? undefined,
            startDate: r.startDate,
            endDate: r.endDate,
            days: r.days,
            reason: r.reason,
            status: r.status,
            userName: r.user?.name ?? r.user?.email ?? "Unbekannt",
            decisionNote: r.decisionNote ?? null,
            context: r.context,
            approvedBy: r.approvedBy ?? null,
          }))}
        />
      ) : null}

      {isManager ? <TeamAbsencesSection companyId={companyId} /> : null}
    </DashboardPageShell>
  );
}
