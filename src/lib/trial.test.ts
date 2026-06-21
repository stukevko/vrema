import { describe, expect, it } from "vitest";
import { PLANS } from "@/lib/plans";
import { computeTrialEndsAt, TRIAL_DAYS } from "@/lib/trial/constants";
import {
  hasFullAppAccess,
  hasPaidSubscription,
  isBillingExempt,
  isInAppTrial,
  isTrialExpired,
  trialDaysRemaining,
} from "@/lib/trial/state";
import { companyHasOperationalAccess } from "@/lib/tenant-access";

const base = {
  trialEndsAt: null as Date | null,
  billingExempt: false,
  tenantStatus: "PENDING" as const,
  isActive: true,
};

describe("trial access", () => {
  it("TRIAL_DAYS ist 14", () => {
    expect(TRIAL_DAYS).toBe(14);
  });

  it("isInAppTrial bei laufender Testphase", () => {
    expect(isInAppTrial({ ...base, trialEndsAt: computeTrialEndsAt() })).toBe(true);
  });

  it("isTrialExpired nach Ablauf", () => {
    const past = new Date(Date.now() - 86_400_000);
    expect(isTrialExpired({ ...base, trialEndsAt: past })).toBe(true);
  });

  it("ACTIVE überschreibt Testphase", () => {
    expect(
      isInAppTrial({ ...base, tenantStatus: "ACTIVE", trialEndsAt: computeTrialEndsAt() }),
    ).toBe(false);
  });

  it("trialDaysRemaining mindestens 1 während Trial", () => {
    expect(trialDaysRemaining({ ...base, trialEndsAt: computeTrialEndsAt() })).toBeGreaterThanOrEqual(1);
  });
});

describe("manual billing access", () => {
  it("billingExempt schlägt durch", () => {
    expect(isBillingExempt({ ...base, billingExempt: true })).toBe(true);
  });

  it("ACTIVE = bezahlt/freigeschaltet", () => {
    expect(hasPaidSubscription({ ...base, tenantStatus: "ACTIVE" })).toBe(true);
  });

  it("PENDING in Testphase ist nicht bezahlt", () => {
    expect(hasPaidSubscription({ ...base, trialEndsAt: computeTrialEndsAt() })).toBe(false);
  });

  it("hasFullAppAccess bei Trial oder ACTIVE", () => {
    expect(hasFullAppAccess({ ...base, tenantStatus: "ACTIVE" })).toBe(true);
    expect(hasFullAppAccess({ ...base, billingExempt: true })).toBe(true);
    expect(hasFullAppAccess({ ...base, trialEndsAt: computeTrialEndsAt() })).toBe(true);
    expect(hasFullAppAccess(base)).toBe(false);
  });

  it("companyHasOperationalAccess folgt Trial/Status", () => {
    expect(companyHasOperationalAccess({ tenantStatus: "ACTIVE", isActive: true })).toBe(true);
    expect(
      companyHasOperationalAccess({
        tenantStatus: "PENDING",
        isActive: true,
        trialEndsAt: computeTrialEndsAt(),
      }),
    ).toBe(true);
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
