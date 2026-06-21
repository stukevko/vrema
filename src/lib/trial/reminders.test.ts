import { describe, expect, it } from "vitest";
import { pendingTrialReminder, trialInAppNotification } from "@/lib/trial/reminders";

const base = {
  id: "c1",
  name: "Test GmbH",
  referredBy: null as string | null,
  trialRemind3dSentAt: null as Date | null,
  trialRemind1dSentAt: null as Date | null,
  trialExpiredNotifiedAt: null as Date | null,
};

describe("trialInAppNotification", () => {
  it("zeigt Warteseite bei manueller Abrechnung", () => {
    const n = trialInAppNotification("3d", 3);
    expect(n.href).toContain("/dashboard/access-pending");
  });
});

describe("pendingTrialReminder", () => {
  it("ist deaktiviert (manuelle Abrechnung)", () => {
    expect(pendingTrialReminder(base)).toBeNull();
  });
});
