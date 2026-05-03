import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMyVacationRequests, getAllVacationRequests } from "@/lib/actions/vacation";
import { VacationList } from "@/components/dashboard/VacationList";
import { VacationRequestForm } from "@/components/dashboard/VacationRequestForm";

export default async function VacationPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const role = session.user.role ?? "EMPLOYEE";
  const isManager = ["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role);

  const [myRequests, teamRequests] = await Promise.all([
    getMyVacationRequests(),
    isManager ? getAllVacationRequests() : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-1 text-foreground sm:space-y-8 sm:px-0">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-xl sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Urlaub & Abwesenheit</h1>
        <p className="text-muted-foreground text-sm mt-1">Anträge stellen, verwalten und genehmigen.</p>
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
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_20px_50px_rgba(0,0,0,0.04)] backdrop-blur-xl sm:p-8">
          <h2 className="font-semibold tracking-tight mb-4">Team-Anträge</h2>
          <VacationList
            requests={teamRequests.map((r) => ({
              ...r,
              userName: (r as { user?: { name?: string } }).user?.name ?? "Unbekannt",
            }))}
            canApprove={true}
          />
        </div>
      )}
    </div>
  );
}
