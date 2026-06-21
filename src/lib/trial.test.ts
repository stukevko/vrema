import { describe, expect, it } from "vitest";
import { PLANS } from "@/lib/plans";
import {
  companyHasOperationalAccess,
  hasFullAppAccess,
  hasPaidSubscription,
  isBillingExempt,
} from "@/lib/trial";

const base = {
  trialEndsAt: null as Date | null,
  billingExempt: false,
  tenantStatus: "PENDING" as const,
  isActive: false,
};

describe("manual billing access", () => {
  it("billingExempt schlägt durch", () => {
    expect(isBillingExempt({ ...base, billingExempt: true })).toBe(true);
  });

  it("ACTIVE = bezahlt/freigeschaltet", () => {
    expect(hasPaidSubscription({ ...base, tenantStatus: "ACTIVE" })).toBe(true);
  });

  it("PENDING ist nicht bezahlt", () => {
    expect(hasPaidSubscription(base)).toBe(false);
  });

  it("hasFullAppAccess nur bei ACTIVE oder billingExempt", () => {
    expect(hasFullAppAccess({ ...base, tenantStatus: "ACTIVE" })).toBe(true);
    expect(hasFullAppAccess({ ...base, billingExempt: true })).toBe(true);
    expect(hasFullAppAccess(base)).toBe(false);
  });

  it("companyHasOperationalAccess folgt tenantStatus", () => {
    expect(companyHasOperationalAccess({ tenantStatus: "ACTIVE", isActive: true })).toBe(true);
    expect(companyHasOperationalAccess({ tenantStatus: "PENDING", isActive: false })).toBe(false);
    expect(
      companyHasOperationalAccess({ tenantStatus: "PENDING", isActive: false, billingExempt: true }),
    ).toBe(true);
  });
});

describe("plan limits (PLANS)", () => {
  it("Petite/Major MA-Limits", () => {
    expect(PLANS.PETITE.limits.employees).toBe(50);
    expect(PLANS.MAJOR.limits.employees).toBe(Infinity);
  });

  it("All-In Features in Petite", () => {
    expect(PLANS.PETITE.limits.pdfExport).toBe(true);
    expect(PLANS.PETITE.limits.payrollEmail).toBe(true);
  });
});
