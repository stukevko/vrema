import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AffiliatePayoutsSection } from "@/components/super-admin/AffiliatePayoutsSection";

export default async function PartnerAdminPage() {
  const session = await auth();
  const isSuperAdmin =
    session?.user?.role === "SUPER_ADMIN" ||
    session?.user?.id === process.env.SUPER_ADMIN_USER_ID;

  if (!isSuperAdmin) redirect("/dashboard");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vertriebspartner</h1>
        <p className="text-sm text-slate-900/45 mt-1">
          Partner anlegen, Abschluesse verfolgen und Auszahlungen als erledigt markieren.
        </p>
      </div>
      <AffiliatePayoutsSection />
    </div>
  );
}

