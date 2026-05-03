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
    <div className="mx-auto max-w-6xl space-y-5 px-1 sm:space-y-6 sm:px-0">
      <div className="min-w-0">
        <h1 className="text-xl font-bold sm:text-2xl">Vertriebspartner</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Partner anlegen, Abschluesse verfolgen und Auszahlungen als erledigt markieren.
        </p>
      </div>
      <AffiliatePayoutsSection />
    </div>
  );
}

