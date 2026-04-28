import type { Plan, PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { randomUUID } from "crypto";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { sendAffiliatePayoutReadyAdminEmail } from "@/lib/email/affiliate-payout-ready";
import { affiliateBountyCentsForPlan } from "@/lib/affiliate-bounty";

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

function chargeInvoiceId(charge: Stripe.Charge): string | null {
  const inv = (charge as Stripe.Charge & { invoice?: string | Stripe.Invoice | null }).invoice;
  if (typeof inv === "string") return inv;
  if (inv && typeof inv === "object" && "id" in inv) return inv.id;
  return null;
}

export async function cancelAffiliateEarningsFromStripeCharge(charge: Stripe.Charge) {
  let invoiceId = chargeInvoiceId(charge);
  if (!invoiceId && typeof charge.id === "string") {
    const full = await stripe.charges.retrieve(charge.id, { expand: ["invoice"] });
    invoiceId = chargeInvoiceId(full);
  }
  if (!invoiceId) {
    return { ok: true as const, skipped: true, reason: "no_invoice" as const };
  }
  const { cancelledCount } = await cancelAffiliateEarningsForStripeInvoice(invoiceId);
  return { ok: true as const, skipped: false, invoiceId, cancelledCount };
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const raw = (
    invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }
  ).subscription;
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "id" in raw) return raw.id;
  return null;
}

async function logAffiliateWebhookError(params: {
  stripeEventType: string;
  reason: string;
  stripeInvoiceId: string;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  details?: string | null;
}) {
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WebhookErrorLog" (
        "id" TEXT PRIMARY KEY,
        "stripeEventType" TEXT NOT NULL,
        "reason" TEXT NOT NULL,
        "stripeInvoiceId" TEXT NOT NULL,
        "stripeSubscriptionId" TEXT,
        "stripeCustomerId" TEXT,
        "details" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
      )
    `);
    await db.$executeRawUnsafe(
      `
      INSERT INTO "WebhookErrorLog"
        ("id", "stripeEventType", "reason", "stripeInvoiceId", "stripeSubscriptionId", "stripeCustomerId", "details")
      VALUES
        ($1, $2, $3, $4, $5, $6, $7)
      `,
      randomUUID(),
      params.stripeEventType,
      params.reason,
      params.stripeInvoiceId,
      params.stripeSubscriptionId ?? null,
      params.stripeCustomerId ?? null,
      params.details ?? null,
    );
  } catch (error) {
    console.error("[affiliate] failed to persist webhook error log", error);
  }
}

/**
 * Erste bezahlte Abo-Rechnung nach Trial (invoice.paid, amount > 0, Subscription nicht trialing):
 * einmalige Fix-Bounty je Plan, max. eine Buchung pro Firma (companyId unique).
 */
export async function createAffiliateEarningFromPaidInvoice(invoice: Stripe.Invoice) {
  const amountPaid = invoice.amount_paid ?? 0;
  if (amountPaid <= 0) {
    return { ok: true as const, skipped: true, reason: "zero_amount" };
  }

  const subscriptionId = invoiceSubscriptionId(invoice);

  if (!subscriptionId) {
    return { ok: true as const, skipped: true, reason: "not_subscription_invoice" };
  }

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  if (sub.status === "trialing") {
    return { ok: true as const, skipped: true, reason: "trialing" };
  }

  let companyId: string | null = sub.metadata?.companyId ?? null;

  if (!companyId && typeof invoice.customer === "string") {
    const company = await db.company.findUnique({
      where: { stripeCustomerId: invoice.customer },
      select: { id: true },
    });
    companyId = company?.id ?? null;
  }

  if (!companyId) {
    await logAffiliateWebhookError({
      stripeEventType: "invoice.paid",
      reason: "no_company",
      stripeInvoiceId: invoice.id,
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: typeof invoice.customer === "string" ? invoice.customer : null,
      details: "Company konnte zum Zeitpunkt des Webhooks nicht aufgeloest werden.",
    });
    return { ok: true as const, skipped: true, reason: "no_company" as const, retryable: true as const };
  }

  const existingForCompany = await db.affiliateEarning.findUnique({
    where: { companyId },
    select: { id: true },
  });
  if (existingForCompany) {
    return { ok: true as const, skipped: true, reason: "bounty_already_granted" };
  }

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      plan: true,
      affiliateId: true,
      affiliate: { select: { id: true } },
    },
  });

  if (!company?.affiliateId || !company.affiliate) {
    return { ok: true as const, skipped: true, reason: "no_affiliate" };
  }

  const bountyCents = affiliateBountyCentsForPlan(company.plan as Plan);
  if (bountyCents === null || bountyCents <= 0) {
    return { ok: true as const, skipped: true, reason: "no_bounty_for_plan" };
  }

  const dupInvoice = await db.affiliateEarning.findUnique({
    where: { stripeInvoiceId: invoice.id },
    select: { id: true },
  });
  if (dupInvoice) {
    return { ok: true as const, skipped: true, reason: "duplicate_invoice" };
  }

  const holdMs = affiliateHoldDays() * 24 * 60 * 60 * 1000;
  const maturesAt = new Date(Date.now() + holdMs);
  const currency = (invoice.currency ?? "eur").toLowerCase();

  try {
    await db.affiliateEarning.create({
      data: {
        affiliateId: company.affiliate.id,
        companyId: company.id,
        stripeInvoiceId: invoice.id,
        plan: company.plan,
        invoiceAmountCents: amountPaid,
        commissionCents: bountyCents,
        currency,
        status: "PENDING",
        maturesAt,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: true as const, skipped: true, reason: "bounty_race_or_duplicate" };
    }
    throw e;
  }

  return { ok: true as const, skipped: false };
}
