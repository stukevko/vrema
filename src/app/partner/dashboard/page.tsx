import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PartnerDashboardClient } from "@/components/partner/PartnerDashboardClient";
import { publicRegisterRefUrl } from "@/lib/affiliate-code";

export default async function PartnerDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/partner-login");
  if (session.user.role !== "AFFILIATE_PARTNER" || !session.user.affiliateId) {
    redirect("/dashboard");
  }

  const affiliate = await db.affiliate.findUnique({
    where: { id: session.user.affiliateId },
    select: {
      id: true,
      code: true,
      name: true,
      earnings: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          plan: true,
          status: true,
          commissionCents: true,
          currency: true,
          createdAt: true,
          paidAt: true,
          company: { select: { name: true } },
        },
      },
    },
  });

  if (!affiliate) redirect("/partner-login");

  const pendingCents = affiliate.earnings
    .filter((e) => e.status === "PENDING")
    .reduce((sum, e) => sum + e.commissionCents, 0);
  const availableCents = affiliate.earnings
    .filter((e) => e.status === "AVAILABLE")
    .reduce((sum, e) => sum + e.commissionCents, 0);
  const paidCents = affiliate.earnings
    .filter((e) => e.status === "PAID")
    .reduce((sum, e) => sum + e.commissionCents, 0);

  return (
    <PartnerDashboardClient
      name={affiliate.name}
      code={affiliate.code}
      refUrl={publicRegisterRefUrl(affiliate.code)}
      pendingCents={pendingCents}
      availableCents={availableCents}
      paidCents={paidCents}
      rows={affiliate.earnings.map((e) => ({
        id: e.id,
        companyName: e.company.name,
        createdAt: e.createdAt.toISOString(),
        plan: e.plan,
        status: e.status,
        commissionCents: e.commissionCents,
        currency: e.currency,
        paidAt: e.paidAt ? e.paidAt.toISOString() : null,
      }))}
    />
  );
}

