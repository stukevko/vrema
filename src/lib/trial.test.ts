import { describe, expect, it } from "vitest";
import {
  companyHasOperationalAccess,
  hasFullAppAccess,
  hasPaidSubscription,
  isBillingExempt,
  isInAppTrial,
  isTrialExpired,
  shouldApplyStripeAccessFlag,
  trialDaysRemaining,
} from "@/lib/trial";

const future = (days: number) => new Date(Date.now() + days * 86_400_000);
const past = (days: number) => new Date(Date.now() - days * 86_400_000);

const base = {
  trialEndsAt: null as Date | null,
  stripeSubId: null as string | null,
  subEndsAt: null as Date | null,
  billingExempt: false,
};

describe("isBillingExempt / hasPaidSubscription", () => {
  it("billingExempt schlägt durch", () => {
    expect(isBillingExempt({ ...base, billingExempt: true })).toBe(true);
    expect(isBillingExempt(base)).toBe(false);
  });

  it("Stripe-SubId oder gültiges subEndsAt = bezahlt", () => {
    expect(hasPaidSubscription({ ...base, stripeSubId: "sub_123" })).toBe(true);
    expect(hasPaidSubscription({ ...base, subEndsAt: future(10) })).toBe(true);
    expect(hasPaidSubscription({ ...base, subEndsAt: past(1) })).toBe(false);
    expect(hasPaidSubscription(base)).toBe(false);
  });
});

describe("isInAppTrial / isTrialExpired", () => {
  it("laufende Testphase", () => {
    const c = { ...base, trialEndsAt: future(5) };
    expect(isInAppTrial(c)).toBe(true);
    expect(isTrialExpired(c)).toBe(false);
  });

  it("abgelaufene Testphase", () => {
    const c = { ...base, trialEndsAt: past(1) };
    expect(isInAppTrial(c)).toBe(false);
    expect(isTrialExpired(c)).toBe(true);
  });

  it("bezahltes Abo ist weder Trial noch abgelaufen", () => {
    const c = { ...base, trialEndsAt: past(1), stripeSubId: "sub_1" };
    expect(isInAppTrial(c)).toBe(false);
    expect(isTrialExpired(c)).toBe(false);
  });

  it("billingExempt ist nie 'abgelaufen'", () => {
    const c = { ...base, trialEndsAt: past(1), billingExempt: true };
    expect(isTrialExpired(c)).toBe(false);
    expect(isInAppTrial(c)).toBe(false);
  });
});

describe("trialDaysRemaining", () => {
  it("rundet verbleibende Tage auf", () => {
    expect(trialDaysRemaining({ ...base, trialEndsAt: future(3) })).toBe(3);
  });

  it("abgelaufen = 0", () => {
    expect(trialDaysRemaining({ ...base, trialEndsAt: past(1) })).toBe(0);
  });

  it("ohne Trial oder mit Abo = 0", () => {
    expect(trialDaysRemaining(base)).toBe(0);
    expect(trialDaysRemaining({ ...base, trialEndsAt: future(3), stripeSubId: "sub_1" })).toBe(0);
  });
});

describe("hasFullAppAccess", () => {
  it("erlaubt bei laufendem Trial, Abo oder exempt", () => {
    expect(hasFullAppAccess({ ...base, trialEndsAt: future(2) })).toBe(true);
    expect(hasFullAppAccess({ ...base, stripeSubId: "sub_1" })).toBe(true);
    expect(hasFullAppAccess({ ...base, billingExempt: true })).toBe(true);
  });

  it("Legacy-Firma ohne Trial-Info bekommt Zugang", () => {
    expect(hasFullAppAccess(base)).toBe(true);
  });

  it("abgelaufener Trial ohne Abo/aktiv = kein Zugang", () => {
    expect(hasFullAppAccess({ ...base, trialEndsAt: past(1), isActive: false })).toBe(false);
  });

  it("isActive=true erlaubt Zugang trotz abgelaufenem Trial", () => {
    expect(hasFullAppAccess({ ...base, trialEndsAt: past(1), isActive: true })).toBe(true);
  });
});

describe("companyHasOperationalAccess", () => {
  it("aktiv ODER Trial ODER Abo ODER exempt → Zugang", () => {
    expect(companyHasOperationalAccess({ ...base, isActive: true })).toBe(true);
    expect(companyHasOperationalAccess({ ...base, isActive: false, trialEndsAt: future(1) })).toBe(true);
    expect(companyHasOperationalAccess({ ...base, isActive: false, stripeSubId: "sub_1" })).toBe(true);
    expect(companyHasOperationalAccess({ ...base, isActive: false, billingExempt: true })).toBe(true);
  });

  it("inaktiv, kein Trial, kein Abo → kein Zugang (kein Legacy-Fallback)", () => {
    expect(companyHasOperationalAccess({ ...base, isActive: false })).toBe(false);
  });
});

describe("shouldApplyStripeAccessFlag", () => {
  it("billingExempt → niemals sperren (false)", () => {
    expect(shouldApplyStripeAccessFlag({ trialEndsAt: null, billingExempt: true }, false)).toBe(false);
  });

  it("active=true → Flag setzen", () => {
    expect(shouldApplyStripeAccessFlag({ trialEndsAt: null, billingExempt: false }, true)).toBe(true);
  });

  it("Zahlungsausfall während laufendem Trial → nicht sperren (false)", () => {
    expect(shouldApplyStripeAccessFlag({ trialEndsAt: future(5), billingExempt: false }, false)).toBe(
      false,
    );
  });

  it("Zahlungsausfall ohne Trial → sperren (true)", () => {
    expect(shouldApplyStripeAccessFlag({ trialEndsAt: null, billingExempt: false }, false)).toBe(true);
  });
});
