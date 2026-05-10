import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMyVacationRequests, getTeamVacationRequestsWithContext } from "@/lib/actions/vacation";
import { VacationList } from "@/components/dashboard/VacationList";
import { VacationRequestForm } from "@/components/dashboard/VacationRequestForm";
import { TeamVacationSection } from "@/components/dashboard/TeamVacationSection";

export default async function VacationPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const role = session.user.role ?? "EMPLOYEE";
  const isManager = ["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role);

  const [myRequests, teamRequests] = await Promise.all([
    getMyVacationRequests(),
    isManager ? getTeamVacationRequestsWithContext() : Promise.resolve([]),
  ]);

  const pendingTeamCount = teamRequests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-1 text-foreground sm:space-y-8 sm:px-0">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-xl sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Urlaub & Abwesenheit</h1>
        <p className="text-muted-foreground text-sm mt-1">Anträge stellen, verwalten und genehmigen.</p>
        {isManager && pendingTeamCount > 0 ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
            {pendingTeamCount} {pendingTeamCount === 1 ? "Antrag" : "Anträge"} warten auf Entscheidung
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="min-w-0">
          <VacationRequestForm />
        </div>
        <div className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-xl sm:p-8">
          <h2 className="font-semibold tracking-tight">Meine Anträge</h2>
          <VacationList requests={myRequests} canApprove={false} />
        </div>
      </div>

      {isManager && teamRequests.length > 0 && (
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
      )}
    </div>
  );
}
