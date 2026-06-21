import type { TenantStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { companyHasOperationalAccess } from "@/lib/tenant-access";

export { TRIAL_DAYS, TRIAL_MAX_EMPLOYEES, computeTrialEndsAt } from "@/lib/trial/constants";

export type CompanyTrialFields = {
  trialEndsAt: Date | null;
  billingExempt?: boolean;
  tenantStatus?: TenantStatus;
  isActive?: boolean;
};

/** Super-Admin / Demo: voller Zugang ohne Rechnung. */
export function isBillingExempt(company: CompanyTrialFields): boolean {
  return Boolean(company.billingExempt);
}

/** Manuell aktiver Tenant (= bezahlt / freigeschaltet). */
export function hasPaidSubscription(company: CompanyTrialFields): boolean {
  if (isBillingExempt(company)) return true;
  return company.tenantStatus === "ACTIVE";
}

export type { CompanyAccessFields } from "@/lib/tenant-access";
export {
  companyHasOperationalAccess,
  isTenantGateExemptPath,
  tenantStatusLabel,
} from "@/lib/tenant-access";

/** Voller App-Zugang. */
export function hasFullAppAccess(
  company: CompanyTrialFields & { isActive?: boolean; tenantStatus?: TenantStatus },
): boolean {
  if (isBillingExempt(company)) return true;
  if (company.tenantStatus === "ACTIVE") return true;
  return false;
}

export function isInAppTrial(_company: CompanyTrialFields): boolean {
  return false;
}

export function isTrialExpired(_company: CompanyTrialFields): boolean {
  return false;
}

export function trialDaysRemaining(_company: CompanyTrialFields): number {
  return 0;
}

export async function getCompanyTrialState(companyId: string) {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { trialEndsAt: true, billingExempt: true, tenantStatus: true, isActive: true },
  });
  if (!company) return null;

  return {
    ...company,
    isInAppTrial: false,
    isTrialExpired: false,
    hasPaidSubscription: hasPaidSubscription(company),
    daysRemaining: 0,
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
