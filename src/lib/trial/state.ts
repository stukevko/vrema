import type { TenantStatus } from "@prisma/client";

export type CompanyTrialFields = {
  trialEndsAt: Date | null;
  billingExempt?: boolean;
  tenantStatus?: TenantStatus;
  isActive?: boolean;
};

function trialEndMs(company: CompanyTrialFields): number | null {
  if (!company.trialEndsAt) return null;
  const ms = new Date(company.trialEndsAt).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function isBillingExempt(company: CompanyTrialFields): boolean {
  return Boolean(company.billingExempt);
}

/** Manuell aktiver Tenant (= bezahlt / freigeschaltet). */
export function hasPaidSubscription(company: CompanyTrialFields): boolean {
  if (isBillingExempt(company)) return true;
  return company.tenantStatus === "ACTIVE";
}

/** Laufende Gratis-Testphase (noch nicht freigeschaltet). */
export function isInAppTrial(company: CompanyTrialFields): boolean {
  if (isBillingExempt(company)) return false;
  if (company.tenantStatus === "ACTIVE") return false;
  const end = trialEndMs(company);
  if (end === null) return false;
  return end > Date.now();
}

export function isTrialExpired(company: CompanyTrialFields): boolean {
  if (isBillingExempt(company)) return false;
  if (company.tenantStatus === "ACTIVE") return false;
  const end = trialEndMs(company);
  if (end === null) return false;
  return end <= Date.now();
}

export function trialDaysRemaining(company: CompanyTrialFields): number {
  const end = trialEndMs(company);
  if (end === null) return 0;
  const diff = end - Date.now();
  if (diff <= 0) return 0;
  return Math.max(1, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

/** Voller App-Zugang (Testphase oder freigeschaltet). */
export function hasFullAppAccess(company: CompanyTrialFields): boolean {
  if (isBillingExempt(company)) return true;
  if (company.tenantStatus === "ACTIVE") return true;
  return isInAppTrial(company);
}
