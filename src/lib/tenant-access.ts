import type { TenantStatus } from "@prisma/client";
import { isInAppTrial, isTrialExpired, type CompanyTrialFields } from "@/lib/trial/state";

export type CompanyAccessFields = {
  tenantStatus: TenantStatus;
  isActive?: boolean;
  billingExempt?: boolean;
  trialEndsAt?: Date | null;
};

/** Produktiv nutzbar (Stempeln, Planer, Terminal …). */
export function companyHasOperationalAccess(company: CompanyAccessFields): boolean {
  if (company.billingExempt) return true;
  if (company.tenantStatus === "ACTIVE") return true;
  return isInAppTrial(company as CompanyTrialFields);
}

export function tenantStatusLabel(status: TenantStatus): string {
  if (status === "ACTIVE") return "Aktiv";
  if (status === "SUSPENDED") return "Gesperrt";
  return "Wartet auf Freischaltung";
}

/** Super-Admin: PENDING während Testphase klarer anzeigen. */
export function tenantDisplayStatus(company: CompanyAccessFields): string {
  if (company.billingExempt) return "Kostenfrei";
  if (company.tenantStatus === "ACTIVE") return "Aktiv";
  if (company.tenantStatus === "SUSPENDED") return "Gesperrt";
  if (isInAppTrial(company as CompanyTrialFields)) return "Testphase";
  if (isTrialExpired(company as CompanyTrialFields)) return "Anfrage offen";
  return "Wartet auf Freischaltung";
}

export type TenantGateRedirect = "none" | "suspended" | "trial-ended" | "access-pending";

export function resolveTenantGateRedirect(company: CompanyAccessFields): TenantGateRedirect {
  if (company.billingExempt) return "none";
  if (company.tenantStatus === "ACTIVE") return "none";
  if (company.tenantStatus === "SUSPENDED") return "suspended";
  if (isInAppTrial(company as CompanyTrialFields)) return "none";
  if (isTrialExpired(company as CompanyTrialFields)) return "trial-ended";
  return "access-pending";
}

/** Dashboard-Routen bei gesperrtem / wartendem Zugang erlaubt. */
export function isTenantGateExemptPath(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard/access-pending") ||
    pathname.startsWith("/dashboard/access-suspended") ||
    pathname.startsWith("/dashboard/trial-ended") ||
    pathname.startsWith("/dashboard/billing") ||
    pathname.startsWith("/dashboard/account") ||
    pathname.startsWith("/dashboard/support") ||
    pathname.startsWith("/dashboard/settings")
  );
}
