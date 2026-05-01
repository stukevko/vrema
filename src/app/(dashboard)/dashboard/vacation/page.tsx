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
    <div className="max-w-5xl mx-auto space-y-8 text-slate-900">
      <div className="rounded-3xl border border-white bg-card backdrop-blur-xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
        <h1 className="text-2xl font-semibold tracking-tight">Urlaub & Abwesenheit</h1>
        <p className="text-muted-foreground text-sm mt-1">Anträge stellen, verwalten und genehmigen.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <VacationRequestForm />
        <div className="space-y-4 rounded-3xl border border-white bg-card backdrop-blur-xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
          <h2 className="font-semibold tracking-tight">Meine Anträge</h2>
          <VacationList requests={myRequests} canApprove={false} />
        </div>
      </div>

      {isManager && teamRequests.length > 0 && (
        <div className="rounded-3xl border border-white bg-card backdrop-blur-xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
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
