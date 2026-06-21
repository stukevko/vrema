import type { TenantStatus } from "@prisma/client";

export type CompanyAccessFields = {
  tenantStatus: TenantStatus;
  isActive: boolean;
  billingExempt?: boolean;
};

/** Produktiv nutzbar (Stempeln, Planer, Terminal …). */
export function companyHasOperationalAccess(company: CompanyAccessFields): boolean {
  if (company.billingExempt) return true;
  return company.tenantStatus === "ACTIVE";
}

export function tenantStatusLabel(status: TenantStatus): string {
  if (status === "ACTIVE") return "Aktiv";
  if (status === "SUSPENDED") return "Gesperrt";
  return "Wartet auf Freischaltung";
}

/** Dashboard-Routen bei PENDING / SUSPENDED erlaubt. */
export function isTenantGateExemptPath(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard/access-pending") ||
    pathname.startsWith("/dashboard/access-suspended") ||
    pathname.startsWith("/dashboard/billing") ||
    pathname.startsWith("/dashboard/account") ||
    pathname.startsWith("/dashboard/support")
  );
}
