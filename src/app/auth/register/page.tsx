import { Suspense } from "react";
import { db } from "@/lib/db";
import { RegisterClient } from "./RegisterClient";

type PageProps = {
  searchParams: Promise<{ ref?: string; plan?: string }>;
};

export default async function RegisterPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const refRaw = (sp.ref ?? "").trim();
  const refCode = refRaw.toLowerCase();
  const rawPlan = sp.plan ?? "STARTER";
  const allowedPlans = ["STARTER", "BUSINESS", "ENTERPRISE"] as const;
  const plan = allowedPlans.includes(rawPlan as (typeof allowedPlans)[number])
    ? (rawPlan as (typeof allowedPlans)[number])
    : "STARTER";

  let affiliatePartnerName: string | null = null;
  if (refCode) {
    const aff = await db.affiliate.findUnique({
      where: { code: refCode },
      select: { name: true },
    });
    affiliatePartnerName = aff?.name ?? null;
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <RegisterClient initialPlan={plan} refCode={refRaw} affiliatePartnerName={affiliatePartnerName} />
    </Suspense>
  );
}
