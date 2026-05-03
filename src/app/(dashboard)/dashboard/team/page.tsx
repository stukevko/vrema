import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTeamMembers } from "@/lib/actions/team";
import { TeamList } from "@/components/dashboard/TeamList";
import { InviteForm } from "@/components/dashboard/InviteForm";
import { Users } from "lucide-react";

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const role = session.user.role ?? "EMPLOYEE";
  const canManage = ["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role);

  const members = await getTeamMembers();

  const active = members.filter((m) => m.isActive).length;
  const inactive = members.filter((m) => !m.isActive).length;

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-1 sm:space-y-6 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">Team</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {active} aktiv{inactive > 0 ? ` · ${inactive} deaktiviert` : ""}
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2">
          <Users className="w-4 h-4 text-[#22c55e]" />
          <span className="text-sm font-bold text-[#22c55e]">{members.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Member list – takes 2/3 */}
        <div className="min-w-0 lg:col-span-2">
          <TeamList members={members} canManage={canManage} currentUserId={session.user.id} />
        </div>

        {/* Invite form – takes 1/3, only for owners/managers */}
        {canManage && (
          <div>
            <InviteForm />
          </div>
        )}
      </div>

    </div>
  );
}
