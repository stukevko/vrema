import type { TenantStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  hasFullAppAccess,
  hasPaidSubscription,
  isInAppTrial,
  isTrialExpired,
  trialDaysRemaining,
  type CompanyTrialFields,
} from "@/lib/trial/state";

export { TRIAL_DAYS, TRIAL_MAX_EMPLOYEES, computeTrialEndsAt } from "@/lib/trial/constants";
export type { CompanyTrialFields } from "@/lib/trial/state";
export {
  hasFullAppAccess,
  hasPaidSubscription,
  isBillingExempt,
  isInAppTrial,
  isTrialExpired,
  trialDaysRemaining,
} from "@/lib/trial/state";

export type { CompanyAccessFields } from "@/lib/tenant-access";
export {
  companyHasOperationalAccess,
  isTenantGateExemptPath,
  resolveTenantGateRedirect,
  tenantDisplayStatus,
  tenantStatusLabel,
} from "@/lib/tenant-access";

export async function getCompanyTrialState(companyId: string) {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { trialEndsAt: true, billingExempt: true, tenantStatus: true, isActive: true, referredBy: true },
  });
  if (!company) return null;

  const inTrial = isInAppTrial(company);
  const expired = isTrialExpired(company);

  return {
    ...company,
    isInAppTrial: inTrial,
    isTrialExpired: expired,
    hasPaidSubscription: hasPaidSubscription(company),
    daysRemaining: inTrial ? trialDaysRemaining(company) : 0,
    hasFullAppAccess: hasFullAppAccess(company),
  };
}

export function isTrialExemptDashboardPath(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard/access-pending") ||
    pathname.startsWith("/dashboard/access-suspended") ||
    pathname.startsWith("/dashboard/billing") ||
    pathname.startsWith("/dashboard/trial-ended") ||
    pathname.startsWith("/dashboard/account") ||
    pathname.startsWith("/dashboard/support") ||
    pathname.startsWith("/dashboard/settings")
  );
}

export function isBillingSuspendedExemptPath(pathname: string): boolean {
  return isTrialExemptDashboardPath(pathname);
}

export async function getCompanyTenantStatus(companyId: string): Promise<TenantStatus | null> {
  const row = await db.company.findUnique({
    where: { id: companyId },
    select: { tenantStatus: true },
  });
  return row?.tenantStatus ?? null;
}
