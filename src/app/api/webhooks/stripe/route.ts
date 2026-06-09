import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import type Stripe from "stripe";
import { applyCheckoutSessionCompleted } from "@/lib/actions/billing";
import {
  reactivateTenantFromPaidInvoice,
  setTenantBillingAccess,
  suspendTenantFromFailedInvoice,
} from "@/lib/billing/stripe-invoice-tenant";
import {
  cancelAffiliateEarningsFromStripeCharge,
  createAffiliateEarningFromPaidInvoice,
} from "@/lib/affiliate-earnings";
import { claimStripeWebhookEvent } from "@/lib/billing/stripe-webhook-idempotency";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    console.error("Webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const isNew = await claimStripeWebhookEvent(event.id, event.type);
  if (!isNew) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { companyId, plan, interval } = session.metadata ?? {};
        if (!companyId) break;

        if (session.mode === "setup" && session.setup_intent) {
          const setupIntent = await stripe.setupIntents.retrieve(session.setup_intent as string, {
            expand: ["payment_method"],
          });
          const paymentMethod = setupIntent.payment_method as Stripe.PaymentMethod | null;
          const fingerprint = paymentMethod?.card?.fingerprint ?? null;

          if (fingerprint) {
            const existingFingerprint = await db.company.findFirst({
              where: {
                stripePaymentMethodFingerprint: fingerprint,
                id: { not: companyId },
              },
              select: { id: true },
            });

            if (existingFingerprint) {
              await db.company.update({
                where: { id: companyId },
                data: {
                  isActive: false,
                  paymentMethodVerifiedAt: null,
                },
              });
              break;
            }
          }

          await db.company.update({
            where: { id: companyId },
            data: {
              stripeCustomerId: (session.customer as string) ?? undefined,
              stripePaymentMethodFingerprint: fingerprint ?? undefined,
              paymentMethodVerifiedAt: new Date(),
              isActive: true,
            },
          });
          break;
        }

        if (!plan) break;
        await applyCheckoutSessionCompleted({
          companyId,
          plan: plan as "STARTER" | "BUSINESS" | "ENTERPRISE",
          interval: interval as "monthly" | "yearly" | undefined,
          stripeCustomerId: (session.customer as string) ?? null,
          stripeSubId: (session.subscription as string) ?? null,
        });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const { companyId, plan } = sub.metadata ?? {};
        if (!companyId) break;

        // Plan & Laufzeit immer spiegeln …
        await db.company.update({
          where: { id: companyId },
          data: {
            plan: (plan as "STARTER" | "BUSINESS" | "ENTERPRISE") ?? undefined,
            subEndsAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
          },
        });
        // … Zugang aber NUR über den zentralen Guard (respektiert billingExempt
        // + laufende Testphase). `trialing` zählt als aktiv, sonst würden Kunden
        // in der Stripe-Testphase ausgesperrt.
        const isActiveStatus =
          sub.status === "active" ||
          sub.status === "trialing";
        await setTenantBillingAccess(companyId, isActiveStatus);
        break;
      }

      case "invoice.payment_action_required": {
        // 3D-Secure / SCA — nicht sperren; Kunde soll im Portal bestätigen.
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const { companyId } = sub.metadata ?? {};
        if (!companyId) break;

        await db.company.update({
          where: { id: companyId },
          data: {
            plan: "STARTER",
            stripeSubId: null,
          },
        });
        // Deaktivieren nur über den Guard — billingExempt/Trial bleiben unberührt.
        await setTenantBillingAccess(companyId, false);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await suspendTenantFromFailedInvoice(invoice);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await reactivateTenantFromPaidInvoice(invoice);
        const result = await createAffiliateEarningFromPaidInvoice(invoice);
        if (result.skipped && "reason" in result && result.reason === "no_company" && "retryable" in result && result.retryable) {
          throw new Error("[affiliate] retry requested: company missing during invoice.paid");
        }
        break;
      }

      /** Rückerstattung: Provision zu dieser Rechnung stornieren (PENDING / AVAILABLE). */
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await cancelAffiliateEarningsFromStripeCharge(charge);
        break;
      }

      case "refund.created": {
        const refund = event.data.object as Stripe.Refund;
        const ch = refund.charge;
        const chargeId =
          typeof ch === "string"
            ? ch
            : ch && typeof ch === "object" && "id" in ch
              ? (ch as { id: string }).id
              : null;
        if (chargeId) {
          const charge = await stripe.charges.retrieve(chargeId, { expand: ["invoice"] });
          await cancelAffiliateEarningsFromStripeCharge(charge);
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
