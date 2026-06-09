import type { CompanyTrialFields } from "@/lib/trial";
import { hasPaidSubscription, isBillingExempt } from "@/lib/trial";

export type CompanyAccessFields = CompanyTrialFields & {
  isActive: boolean;
};

/**
 * Operativer Zugang (Login, Terminal, Dashboard):
 * - kostenfrei freigeschaltet, oder
 * - bezahltes Abo, oder
 * - Testphase läuft noch (trialEndsAt), oder
 * - Firma aktiv (Stripe / manuell).
 */
export function companyHasOperationalAccess(company: CompanyAccessFields): boolean {
  if (isBillingExempt(company)) return true;
  // Laufende Testphase hat Vorrang (Stripe-Sperre greift hier nicht).
  if (company.trialEndsAt && company.trialEndsAt > new Date()) return true;
  // Explizite Sperre (Zahlungsausfall) schlägt auch bei hinterlegter stripeSubId durch.
  if (company.isActive === false) return false;
  if (hasPaidSubscription(company)) return true;
  if (company.isActive) return true;
  return false;
}

/** Stripe-Zahlungsausfall: nicht sperren, solange die Testphase noch läuft. */
export function shouldApplyStripeAccessFlag(
  company: Pick<CompanyAccessFields, "trialEndsAt" | "billingExempt">,
  active: boolean,
): boolean {
  if (company.billingExempt) return false;
  if (active) return true;
  if (company.trialEndsAt && company.trialEndsAt > new Date()) return false;
  return true;
}
