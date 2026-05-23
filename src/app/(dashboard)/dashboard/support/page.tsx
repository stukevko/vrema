import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LifeBuoy } from "lucide-react";
import { SupportHub } from "@/components/dashboard/SupportHub";
import { OrgTeamSupportInbox } from "@/components/dashboard/OrgTeamSupportInbox";
import { SupportInboxBridge } from "./SupportInboxBridge";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const role = session.user.role ?? "EMPLOYEE";
  const canManageTeam = ["COMPANY_OWNER", "MANAGER"].includes(role);

  return (
    <DashboardPageShell maxWidth="4xl" className="space-y-6">
      <DashboardPageHeader
        variant="card"
        icon={LifeBuoy}
        eyebrow="Hilfe"
        title="Hilfe & Support"
        description={
          canManageTeam
            ? "Anfragen an VREMA oder Tickets deines Teams — alles an einem Ort."
            : "Tickets durchsuchen, Antworten lesen oder eine neue Anfrage starten."
        }
      />

      <Suspense fallback={<p className="text-sm text-muted-foreground">Lade Support…</p>}>
        <SupportHub
          canManageTeam={canManageTeam}
          vremaInbox={<SupportInboxBridge />}
          teamInbox={<OrgTeamSupportInbox />}
        />
      </Suspense>
    </DashboardPageShell>
  );
}
