import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTeamMembers, ensureEmployeeNumbersAssigned } from "@/lib/actions/team";
import { TeamList } from "@/components/dashboard/TeamList";
import { InviteForm } from "@/components/dashboard/InviteForm";
import { TeamInviteLinkCard } from "@/components/dashboard/TeamInviteLinkCard";
import { Users, UserCheck, UserMinus, ShieldCheck } from "lucide-react";
import { getCompanyTrialState } from "@/lib/trial";
import { countActiveEmployees } from "@/lib/plan-limits";

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const role = session.user.role ?? "EMPLOYEE";
  const canManage = ["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role);

  if (canManage) {
    try {
      await ensureEmployeeNumbersAssigned();
    } catch {
      // Seltene DB-Serialisierung: Team-Seite trotzdem laden
    }
  }

  const members = await getTeamMembers();

  const trial =
    canManage && session.user.companyId
      ? await getCompanyTrialState(session.user.companyId)
      : null;
  const activeEmployeeCount =
    canManage && session.user.companyId
      ? await countActiveEmployees(session.user.companyId)
      : 0;

  const total = members.length;
  const active = members.filter((m) => m.isActive).length;
  const inactive = total - active;
  const managers = members.filter((m) =>
    ["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(m.role)
  ).length;

  const stats: Array<{
    key: string;
    label: string;
    value: number;
    Icon: React.ComponentType<{ className?: string }>;
    tone: "brand" | "success" | "muted" | "warning";
  }> = [
    { key: "total", label: "Gesamt", value: total, Icon: Users, tone: "brand" },
    { key: "active", label: "Aktiv", value: active, Icon: UserCheck, tone: "success" },
    { key: "inactive", label: "Inaktiv", value: inactive, Icon: UserMinus, tone: "muted" },
    { key: "managers", label: "Führung", value: managers, Icon: ShieldCheck, tone: "warning" },
  ];

  const toneClass: Record<typeof stats[number]["tone"], string> = {
    brand: "bg-brand-soft text-brand border-brand/20 dark:border-white/10",
    success: "bg-success-soft text-success-foreground border-success/20 dark:border-white/10",
    muted: "bg-surface-muted/85 text-fg-muted border-line dark:border-white/10 dark:bg-surface-muted/40",
    warning: "bg-warning-soft text-warning-foreground border-warning/25 dark:border-white/10",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-1 sm:space-y-6 sm:px-0">
      {/* Hero */}
      <section className="flex flex-col gap-4">
        <div className="min-w-0">
          <h1 className="text-base font-bold tracking-tight sm:text-xl md:text-2xl">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {active} aktiv{inactive > 0 ? ` · ${inactive} deaktiviert` : ""}
          </p>
        </div>

        {/* Stats-Pills */}
        <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto scrollbar-hide px-1 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.key}
              className={`flex min-w-[10rem] shrink-0 snap-start items-center gap-3 rounded-2xl border px-4 py-3 backdrop-blur-xl sm:min-w-0 ${toneClass[s.tone]}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/30 dark:bg-white/8">
                <s.Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-widest opacity-80">{s.label}</p>
                <p className="text-lg font-bold tabular-nums leading-none">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <TeamList members={members} canManage={canManage} currentUserId={session.user.id} />
        </div>

        {canManage && (
          <div className="space-y-4">
            <InviteForm trialActive={trial?.isInAppTrial ?? false} activeEmployees={activeEmployeeCount} />
            <TeamInviteLinkCard />
          </div>
        )}
      </div>
    </div>
  );
}
