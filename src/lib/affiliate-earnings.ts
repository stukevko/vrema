import type { Plan, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { sendAffiliatePayoutReadyAdminEmail } from "@/lib/email/affiliate-payout-ready";

export type AffiliateMaturationReport = {
  maturedCount: number;
  executedAt: string;
  maturedPartnerSummaries: { partnerName: string; partnerCode: string; maturedTotalCents: number }[];
};

function affiliateHoldDays(): number {
  const raw = process.env.AFFILIATE_HOLD_DAYS;
  const n = raw ? Number(raw) : 30;
  if (!Number.isFinite(n) || n < 0) return 30;
  return Math.floor(n);
}

export async function runMatureAffiliateEarnings(
  client: Pick<PrismaClient, "affiliateEarning"> = db,
): Promise<AffiliateMaturationReport> {
  const now = new Date();

  const pendingRows = await client.affiliateEarning.findMany({
    where: {
      status: "PENDING",
      maturesAt: { lte: now },
    },
    include: {
      affiliate: { select: { id: true, name: true, code: true } },
    },
  });

  if (pendingRows.length === 0) {
    return {
      maturedCount: 0,
      executedAt: now.toISOString(),
      maturedPartnerSummaries: [],
    };
  }

  const result = await client.affiliateEarning.updateMany({
    where: {
      status: "PENDING",
      maturesAt: { lte: now },
    },
    data: { status: "AVAILABLE" },
  });

  const byAffiliate = new Map<string, { partnerName: string; partnerCode: string; maturedTotalCents: number }>();
  for (const row of pendingRows) {
    const cur = byAffiliate.get(row.affiliateId) ?? {
      partnerName: row.affiliate.name,
      partnerCode: row.affiliate.code,
      maturedTotalCents: 0,
    };
    cur.maturedTotalCents += row.commissionCents;
    byAffiliate.set(row.affiliateId, cur);
  }

  const maturedPartnerSummaries = [...byAffiliate.values()];
  await sendAffiliatePayoutReadyAdminEmail(maturedPartnerSummaries);

  return {
    maturedCount: result.count,
    executedAt: now.toISOString(),
    maturedPartnerSummaries,
  };
}

export async function cancelAffiliateEarningsForStripeInvoice(stripeInvoiceId: string) {
  const result = await db.affiliateEarning.updateMany({
    where: {
      stripeInvoiceId,
      status: { in: ["PENDING", "AVAILABLE"] },
    },
    data: { status: "CANCELLED" },
  });
  return { cancelledCount: result.count };
}

/** Manuelle Abrechnung — Stripe-Webhooks entfallen. */
export async function createAffiliateEarningFromPaidInvoice(_invoice: unknown) {
  return { ok: true as const, skipped: true, reason: "manual_billing" as const };
}

export async function cancelAffiliateEarningsFromStripeCharge(_charge: unknown) {
  return { ok: true as const, skipped: true, reason: "manual_billing" as const };
}

export { affiliateHoldDays };
