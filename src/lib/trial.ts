import { db } from "@/lib/db";
import {
  TRIAL_DAYS,
  TRIAL_MAX_EMPLOYEES,
  computeTrialEndsAt,
} from "@/lib/trial/constants";

export { TRIAL_DAYS, TRIAL_MAX_EMPLOYEES, computeTrialEndsAt };

export type CompanyTrialFields = {
  trialEndsAt: Date | null;
  stripeSubId: string | null;
  subEndsAt: Date | null;
};

/** Bezahltes Abo (Stripe) — unabhängig von der App-Testphase. */
export function hasPaidSubscription(company: CompanyTrialFields): boolean {
  if (company.stripeSubId) return true;
  if (company.subEndsAt && company.subEndsAt > new Date()) return true;
  return false;
}

export function isInAppTrial(company: CompanyTrialFields): boolean {
  if (!company.trialEndsAt) return false;
  if (hasPaidSubscription(company)) return false;
  return company.trialEndsAt > new Date();
}

export function isTrialExpired(company: CompanyTrialFields): boolean {
  if (!company.trialEndsAt) return false;
  if (hasPaidSubscription(company)) return false;
  return company.trialEndsAt <= new Date();
}

export function trialDaysRemaining(company: CompanyTrialFields): number {
  if (!company.trialEndsAt || hasPaidSubscription(company)) return 0;
  const ms = company.trialEndsAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export async function getCompanyTrialState(companyId: string) {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { trialEndsAt: true, stripeSubId: true, subEndsAt: true },
  });
  if (!company) return null;

  return {
    ...company,
    isInAppTrial: isInAppTrial(company),
    isTrialExpired: isTrialExpired(company),
    hasPaidSubscription: hasPaidSubscription(company),
    daysRemaining: trialDaysRemaining(company),
  };
}

/** Dashboard-Routen, die auch nach abgelaufener Testphase erreichbar bleiben. */
export function isTrialExemptDashboardPath(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard/billing") ||
    pathname.startsWith("/dashboard/trial-ended") ||
    pathname.startsWith("/dashboard/account")
  );
}
