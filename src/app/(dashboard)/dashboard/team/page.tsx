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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-white/40 text-sm mt-1">
            {active} aktiv{inactive > 0 ? ` · ${inactive} deaktiviert` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20">
          <Users className="w-4 h-4 text-[#22c55e]" />
          <span className="text-sm font-bold text-[#22c55e]">{members.length}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Member list – takes 2/3 */}
        <div className="lg:col-span-2">
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
