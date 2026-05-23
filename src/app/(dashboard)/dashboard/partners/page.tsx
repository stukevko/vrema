import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AffiliatePayoutsSection } from "@/components/super-admin/AffiliatePayoutsSection";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

export default async function PartnerAdminPage() {
  const session = await auth();
  const isSuperAdmin =
    session?.user?.role === "SUPER_ADMIN" ||
    session?.user?.id === process.env.SUPER_ADMIN_USER_ID;

  if (!isSuperAdmin) redirect("/dashboard");

  return (
    <DashboardPageShell maxWidth="6xl">
      <DashboardPageHeader
        variant="plain"
        eyebrow="Super-Admin · Affiliate"
        title="Vertriebspartner"
        description="Partner anlegen, Abschlüsse verfolgen und Auszahlungen als erledigt markieren."
      />
      <AffiliatePayoutsSection />
    </DashboardPageShell>
  );
}

