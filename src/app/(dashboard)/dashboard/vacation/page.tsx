import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMyVacationRequests, getTeamVacationRequestsWithContext } from "@/lib/actions/vacation";
import { getVacationPlanContext } from "@/lib/actions/vacation-plan";
import { VacationList } from "@/components/dashboard/VacationList";
import { VacationRequestForm } from "@/components/dashboard/VacationRequestForm";
import { VacationPlanSection } from "@/components/dashboard/VacationPlanSection";
import { AbsencePrivacyInfo } from "@/components/dashboard/AbsencePrivacyInfo";
import { CollapsibleMobileSection } from "@/components/dashboard/CollapsibleMobileSection";
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

  const planYear = new Date().getFullYear();

  const [myRequests, teamRequests, planContext] = await Promise.all([
    getMyVacationRequests(),
    isManager ? getTeamVacationRequestsWithContext() : Promise.resolve([]),
    getVacationPlanContext(planYear),
  ]);

  const pendingTeamCount = teamRequests.filter((r) => r.status === "PENDING").length;
  const openWishCount = planContext.myWishes.filter((w) => w.status === "WISH").length;

  const planSection = (
    <VacationPlanSection
      year={planContext.year}
      submissionsOpen={planContext.submissionsOpen}
      isManager={planContext.isManager}
      myWishes={planContext.myWishes.map((w) => ({
        id: w.id,
        userId: w.userId,
        userName: "",
        year: w.year,
        startDate: w.startDate,
        endDate: w.endDate,
        days: w.days,
        note: w.note,
        status: w.status,
        submittedAt: w.submittedAt,
      }))}
      teamWishes={planContext.teamWishes}
    />
  );

  return (
    <DashboardPageShell maxWidth="5xl" className="max-md:space-y-4 sm:space-y-8">
      {isManager && pendingTeamCount > 0 ? (
        <p className="inline-flex items-center gap-2 rounded-full bg-warning-soft px-3 py-1.5 text-xs font-semibold text-warning-foreground md:hidden">
          {pendingTeamCount} {pendingTeamCount === 1 ? "Antrag" : "Anträge"} warten auf Entscheidung
        </p>
      ) : null}
      <DashboardPageHeader
        variant="card"
        icon={CalendarDays}
        eyebrow="Abwesenheit"
        title="Abwesenheit"
        description="Urlaub beantragen, krank melden — als Führungskraft freigeben."
        hideOnMobile
        badge={
          isManager && pendingTeamCount > 0 ? (
            <p className="inline-flex items-center gap-2 rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning-foreground">
              {pendingTeamCount} {pendingTeamCount === 1 ? "Antrag" : "Anträge"} warten auf Entscheidung
            </p>
          ) : null
        }
      />

      {/* Mobil: Formular zuerst — Kernaktion ohne Scroll */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <div className="min-w-0">
          <VacationRequestForm />
        </div>
        <div className="min-w-0 space-y-4 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-card)] dark:border-white/10 dark:bg-surface/90 sm:p-8">
          <h2 className="font-semibold tracking-tight">Meine Anträge</h2>
          <VacationList requests={myRequests} canApprove={false} />
        </div>
      </div>

      {isManager ? (
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
            hasSickAttachment: Boolean(r.sickAttachmentMime),
            context: r.context,
            approvedBy: r.approvedBy ?? null,
          }))}
        />
      ) : null}

      {isManager ? <TeamAbsencesSection companyId={companyId} /> : null}

      <CollapsibleMobileSection
        label={
          openWishCount > 0
            ? `Urlaubswünsche ${planYear} (${openWishCount} Entwurf${openWishCount === 1 ? "" : "e"})`
            : `Urlaubswünsche ${planYear}`
        }
        defaultOpen={false}
      >
        {planSection}
      </CollapsibleMobileSection>

      <AbsencePrivacyInfo isManager={isManager} />
    </DashboardPageShell>
  );
}
