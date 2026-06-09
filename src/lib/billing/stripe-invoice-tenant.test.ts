import { describe, expect, it } from "vitest";
import { companyHasOperationalAccess, shouldApplyStripeAccessFlag } from "@/lib/trial/access";

const future = (days: number) => new Date(Date.now() + days * 86_400_000);

describe("stripe payment failure access", () => {
  it("sperrt Tenant mit Abo wenn isActive false", () => {
    expect(
      companyHasOperationalAccess({
        trialEndsAt: null,
        stripeSubId: "sub_live_1",
        subEndsAt: null,
        billingExempt: false,
        isActive: false,
      }),
    ).toBe(false);
  });

  it("sperrt nicht während laufender Testphase (shouldApplyStripeAccessFlag)", () => {
    expect(
      shouldApplyStripeAccessFlag({ trialEndsAt: future(5), billingExempt: false }, false),
    ).toBe(false);
  });

  it("sperrt nach Trial bei Zahlungsausfall", () => {
    expect(
      shouldApplyStripeAccessFlag({ trialEndsAt: null, billingExempt: false }, false),
    ).toBe(true);
  });
});
