import { describe, expect, it } from "vitest";
import { pendingTrialReminder, trialInAppNotification } from "@/lib/trial/reminders";

const base = {
  id: "c1",
  name: "Test GmbH",
  referredBy: null as string | null,
  trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  tenantStatus: "PENDING" as const,
  billingExempt: false,
  trialRemind3dSentAt: null as Date | null,
  trialRemind1dSentAt: null as Date | null,
  trialExpiredNotifiedAt: null as Date | null,
};

describe("trialInAppNotification", () => {
  it("verweist auf Billing bei manueller Freischaltung", () => {
    const n = trialInAppNotification("3d", 3);
    expect(n.href).toContain("/dashboard/billing");
  });
});

describe("pendingTrialReminder", () => {
  it("meldet 3-Tage-Erinnerung in laufender Testphase", () => {
    expect(pendingTrialReminder(base)).toBe("3d");
  });

  it("überspringt freigeschaltete Tenants", () => {
    expect(pendingTrialReminder({ ...base, tenantStatus: "ACTIVE" })).toBeNull();
  });

  it("überspringt wenn 3d bereits gesendet", () => {
    expect(
      pendingTrialReminder({ ...base, trialRemind3dSentAt: new Date() }),
    ).toBeNull();
  });
});
