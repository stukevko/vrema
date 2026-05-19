import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PeakDemandEditor } from "@/components/dashboard/PeakDemandEditor";
import { getPeakDemandProfile } from "@/lib/actions/peak-demand";
import Link from "next/link";

const CAN_ACCESS = new Set(["COMPANY_OWNER", "MANAGER", "ADVISOR", "SUPER_ADMIN"]);

export default async function PeakDemandPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const role = session.user.role ?? "EMPLOYEE";
  if (!CAN_ACCESS.has(role)) redirect("/dashboard");

  const profile = await getPeakDemandProfile();
  const isAdvisor = role === "ADVISOR";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand">Auslastung</p>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {isAdvisor ? "Umsatz & Stoßzeiten" : "Stoßzeiten & Umsatz"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isAdvisor
            ? "Du pflegst nur dieses Profil — keine Schichten, keine Löhne, kein Team."
            : "Für Berater oder Küchenchef: Peak-Muster eintragen, Personal-Hinweise im Planer werden schärfer."}
        </p>
        {!isAdvisor ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Berater einladen: unter{" "}
            <Link href="/dashboard/team" className="font-medium text-brand underline-offset-2 hover:underline">
              Team
            </Link>{" "}
            mit Rolle „Berater“.
          </p>
        ) : null}
      </div>

      <PeakDemandEditor initial={profile} />
    </div>
  );
}
