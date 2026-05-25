import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { shouldApplyStripeAccessFlag } from "@/lib/trial/access";

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const raw = (
    invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }
  ).subscription;
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "id" in raw) return raw.id;
  return null;
}

function invoiceCustomerId(invoice: Stripe.Invoice): string | null {
  const raw = invoice.customer;
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "id" in raw) return (raw as { id: string }).id;
  return null;
}

/** Firma aus Abo-Metadata oder Stripe-Customer-ID auflösen. */
export async function resolveCompanyIdFromStripeInvoice(
  invoice: Stripe.Invoice,
): Promise<string | null> {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      if (sub.metadata?.companyId) return sub.metadata.companyId;
    } catch {
      // Subscription evtl. gelöscht — Fallback auf Customer
    }
  }

  const customerId = invoiceCustomerId(invoice);
  if (!customerId) return null;

  const company = await db.company.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return company?.id ?? null;
}

/**
 * Zugang sperren/freigeben bei Zahlungsausfall/-erfolg.
 * `billingExempt`-Tenants bleiben unberührt (Super-Admin / Demo).
 */
export async function setTenantBillingAccess(companyId: string, active: boolean): Promise<void> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { billingExempt: true, trialEndsAt: true },
  });
  if (!company || company.billingExempt) return;
  if (!shouldApplyStripeAccessFlag(company, active)) return;

  await db.company.update({
    where: { id: companyId },
    data: { isActive: active },
  });
}

export async function suspendTenantFromFailedInvoice(invoice: Stripe.Invoice): Promise<boolean> {
  const companyId = await resolveCompanyIdFromStripeInvoice(invoice);
  if (!companyId) return false;
  await setTenantBillingAccess(companyId, false);
  return true;
}

export async function reactivateTenantFromPaidInvoice(invoice: Stripe.Invoice): Promise<boolean> {
  const companyId = await resolveCompanyIdFromStripeInvoice(invoice);
  if (!companyId) return false;

  const amountPaid = invoice.amount_paid ?? 0;
  if (amountPaid <= 0) return false;

  await setTenantBillingAccess(companyId, true);
  return true;
}
