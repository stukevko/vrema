"use server";

import { stripe, PLANS } from "@/lib/stripe";
import { env } from "@/lib/env";
import { requireTenant } from "@/lib/tenant-guard";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

type PlanKey = "STARTER" | "BUSINESS" | "ENTERPRISE";
type Interval = "monthly" | "yearly";

export async function applyCheckoutSessionCompleted(data: {
  companyId: string;
  plan: PlanKey;
  interval?: Interval | "MONTHLY" | "YEARLY";
  stripeCustomerId?: string | null;
  stripeSubId?: string | null;
}) {
  const normalizedInterval = data.interval === "yearly" || data.interval === "YEARLY" ? "YEARLY" : "MONTHLY";

  await db.company.update({
    where: { id: data.companyId },
    data: {
      plan: data.plan,
      billingInterval: normalizedInterval,
      stripeCustomerId: data.stripeCustomerId ?? undefined,
      stripeSubId: data.stripeSubId ?? undefined,
      paymentMethodVerifiedAt: new Date(),
      isActive: true,
    },
  });
}

export async function createCardSetupSession() {
  const { companyId, userId } = await requireTenant();
  const baseUrl = env.NEXT_PUBLIC_APP_URL;

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { stripeCustomerId: true, name: true },
  });
  if (!company) {
    redirect("/setup?payment=error");
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  let customerId = company.stripeCustomerId ?? null;
  if (!customerId) {
    try {
      const customer = await stripe.customers.create({
        email: user?.email ?? undefined,
        name: company.name,
        metadata: { companyId, ownerUserId: userId },
      });
      customerId = customer.id;

      await db.company.update({
        where: { id: companyId },
        data: { stripeCustomerId: customerId },
      });
    } catch (error) {
      console.error("[createCardSetupSession] customer create failed", error);
      redirect("/setup?payment=error");
    }
  }

  let sessionUrl: string | null = null;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      payment_method_types: ["card"],
      customer: customerId,
      metadata: { companyId },
      success_url: `${baseUrl}/setup?payment=ok`,
      cancel_url: `${baseUrl}/setup?payment=cancel`,
    });
    sessionUrl = session.url ?? null;
  } catch (error) {
    console.error("[createCardSetupSession] checkout session failed", error);
    redirect("/setup?payment=error");
  }

  if (!sessionUrl) {
    redirect("/setup?payment=error");
  }
  redirect(sessionUrl);
}

export async function createCheckoutSession(plan: PlanKey, interval: Interval) {
  const { companyId } = await requireTenant();

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { stripeCustomerId: true, name: true },
  });

  if (!company) throw new Error("Company not found");

  if (plan === "ENTERPRISE") {
    redirect("mailto:kontakt@kevko.studio?subject=Enterprise%20Anfrage%20Vrema");
  }

  const priceId = PLANS[plan].priceIds[interval];
  const baseUrl = env.NEXT_PUBLIC_APP_URL;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card", "paypal"],
    line_items: [{ price: priceId, quantity: 1 }],
    // Re-use existing customer or let Stripe create one
    ...(company.stripeCustomerId
      ? { customer: company.stripeCustomerId }
      : {}),
    metadata: { companyId, plan, interval },
    // success_url & cancel_url must point to the real domain in production.
    // Set NEXT_PUBLIC_APP_URL=https://vrema.app in your .env.production
    success_url: `${baseUrl}/dashboard/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/dashboard/billing?canceled=1`,
    subscription_data: {
      metadata: { companyId, plan, interval },
    },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    tax_id_collection: { enabled: true },
  });

  if (!session.url) throw new Error("No checkout URL");
  redirect(session.url);
}

export async function createBillingPortalSession() {
  const { companyId } = await requireTenant();

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { stripeCustomerId: true },
  });

  if (!company?.stripeCustomerId) {
    throw new Error("No Stripe customer found");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: company.stripeCustomerId,
    return_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
  });

  redirect(session.url);
}
