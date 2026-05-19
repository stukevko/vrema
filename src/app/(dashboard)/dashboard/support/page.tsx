import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LifeBuoy } from "lucide-react";
import { SupportHub } from "@/components/dashboard/SupportHub";
import { OrgTeamSupportInbox } from "@/components/dashboard/OrgTeamSupportInbox";
import { SupportInboxBridge } from "./SupportInboxBridge";

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const role = session.user.role ?? "EMPLOYEE";
  const canManageTeam = ["COMPANY_OWNER", "MANAGER"].includes(role);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-1 sm:px-0">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <LifeBuoy className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Hilfe & Support</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {canManageTeam
                ? "Anfragen an VREMA oder Tickets deines Teams — alles an einem Ort."
                : "Tickets durchsuchen, Antworten lesen oder eine neue Anfrage starten."}
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Lade Support…</p>}>
        <SupportHub
          canManageTeam={canManageTeam}
          vremaInbox={<SupportInboxBridge />}
          teamInbox={<OrgTeamSupportInbox />}
        />
      </Suspense>
    </div>
  );
}
