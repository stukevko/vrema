import { Suspense } from "react";
import { db } from "@/lib/db";
import { isFlyerReferralCode, flyerReferralDisplayName } from "@/lib/trial/referral";
import { RegisterClient } from "./RegisterClient";

type PageProps = {
  searchParams: Promise<{ ref?: string; plan?: string; code?: string; org?: string; role?: string }>;
};

export default async function RegisterPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const refRaw = (sp.ref ?? "").trim();
  const refCode = refRaw.toLowerCase();
  const inviteCode = (sp.code ?? "").trim().toLowerCase();
  const inviteOrgId = (sp.org ?? "").trim();
  const inviteRole = (sp.role ?? "").trim().toUpperCase();
  const rawPlan = sp.plan ?? "PETITE";
  const allowedPlans = ["PETITE", "MAJOR"] as const;
  const plan = allowedPlans.includes(rawPlan as (typeof allowedPlans)[number])
    ? (rawPlan as (typeof allowedPlans)[number])
    : "PETITE";

  let affiliatePartnerName: string | null = null;
  let flyerReferralLabel: string | null = null;
  if (refCode) {
    const aff = await db.affiliate.findUnique({
      where: { code: refCode },
      select: { name: true },
    });
    if (aff) {
      affiliatePartnerName = aff.name;
    } else if (isFlyerReferralCode(refCode)) {
      flyerReferralLabel = flyerReferralDisplayName(refCode);
    }
  }

  let inviteContext: {
    code: string;
    orgId: string;
    role: "USER" | "MANAGER" | "ADVISOR";
    orgName: string;
  } | null = null;

  if (
    inviteCode &&
    inviteOrgId &&
    (inviteRole === "USER" || inviteRole === "MANAGER" || inviteRole === "ADVISOR")
  ) {
    const invite = await db.inviteLink.findFirst({
      where: {
        code: inviteCode,
        orgId: inviteOrgId,
        role: inviteRole as "USER" | "MANAGER" | "ADVISOR",
        expiresAt: { gt: new Date() },
      },
      include: {
        org: { select: { name: true } },
      },
    });
    const underUsageLimit = invite ? invite.maxUses === null || invite.usedCount < invite.maxUses : false;
    if (invite && underUsageLimit) {
      inviteContext = {
        code: invite.code,
        orgId: invite.orgId,
        role: invite.role,
        orgName: invite.org.name,
      };
    }
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <RegisterClient
        initialPlan={plan}
        refCode={refRaw}
        affiliatePartnerName={affiliatePartnerName}
        flyerReferralLabel={flyerReferralLabel}
        inviteContext={inviteContext}
      />
    </Suspense>
  );
}
