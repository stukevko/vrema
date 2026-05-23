import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PeakDemandEditor } from "@/components/dashboard/PeakDemandEditor";
import { getPeakDemandProfile } from "@/lib/actions/peak-demand";
import { getCompanyModulesForTenant } from "@/lib/actions/company-modules";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

const CAN_ACCESS = new Set(["COMPANY_OWNER", "MANAGER", "ADVISOR", "SUPER_ADMIN"]);

export default async function PeakDemandPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const role = session.user.role ?? "EMPLOYEE";
  if (!CAN_ACCESS.has(role)) redirect("/dashboard");

  const modules = await getCompanyModulesForTenant();
  if (!modules.peaks && role !== "ADVISOR" && role !== "SUPER_ADMIN") {
    redirect("/dashboard/settings#company-modules");
  }

  const profile = await getPeakDemandProfile();
  const isAdvisor = role === "ADVISOR";

  return (
    <DashboardPageShell maxWidth="2xl">
      <DashboardPageHeader
        variant="card"
        icon={TrendingUp}
        eyebrow="Auslastung"
        title={isAdvisor ? "Umsatz & Stoßzeiten" : "Stoßzeiten & Umsatz"}
        description={
          isAdvisor
            ? "Du pflegst nur dieses Profil — keine Schichten, keine Löhne, kein Team."
            : "Peak-Muster eintragen — Personal-Hinweise im Planer werden schärfer."
        }
        badge={
          !isAdvisor ? (
            <p className="text-xs text-muted-foreground">
              Berater einladen: unter{" "}
              <Link href="/dashboard/team" className="font-medium text-brand underline-offset-2 hover:underline">
                Team
              </Link>{" "}
              mit Rolle „Berater“.
            </p>
          ) : null
        }
      />
      <PeakDemandEditor initial={profile} />
    </DashboardPageShell>
  );
}
