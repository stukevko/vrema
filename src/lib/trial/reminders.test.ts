import { describe, expect, it } from "vitest";
import { pendingTrialReminder, trialInAppNotification } from "@/lib/trial/reminders";

const future = (days: number) => new Date(Date.now() + days * 86_400_000);
const past = (days: number) => new Date(Date.now() - days * 86_400_000);

const base = {
  id: "c1",
  name: "Test GmbH",
  referredBy: null as string | null,
  trialEndsAt: future(5) as Date | null,
  stripeSubId: null as string | null,
  subEndsAt: null as Date | null,
  billingExempt: false,
  trialRemind3dSentAt: null as Date | null,
  trialRemind1dSentAt: null as Date | null,
  trialExpiredNotifiedAt: null as Date | null,
};

describe("trialInAppNotification", () => {
  it("liefert Billing-Link für 3d", () => {
    const n = trialInAppNotification("3d", 3);
    expect(n.href).toContain("/dashboard/billing");
    expect(n.title).toContain("3 Tage");
  });
});

describe("pendingTrialReminder", () => {
  it("meldet 3d wenn 2–3 Tage übrig und noch nicht gesendet", () => {
    expect(pendingTrialReminder({ ...base, trialEndsAt: future(3) })).toBe("3d");
    expect(pendingTrialReminder({ ...base, trialEndsAt: future(2.5) })).toBe("3d");
  });

  it("meldet 1d am letzten Tag", () => {
    expect(pendingTrialReminder({ ...base, trialEndsAt: future(1) })).toBe("1d");
  });

  it("meldet expired nach Ablauf", () => {
    expect(pendingTrialReminder({ ...base, trialEndsAt: past(0.5) })).toBe("expired");
  });

  it("ignoriert bereits gesendete Stufen", () => {
    expect(
      pendingTrialReminder({ ...base, trialEndsAt: future(3), trialRemind3dSentAt: new Date() }),
    ).toBeNull();
    expect(
      pendingTrialReminder({ ...base, trialEndsAt: future(1), trialRemind1dSentAt: new Date() }),
    ).toBeNull();
    expect(
      pendingTrialReminder({ ...base, trialEndsAt: past(0.5), trialExpiredNotifiedAt: new Date() }),
    ).toBeNull();
  });

  it("ignoriert billingExempt, Abo und fehlendes trialEndsAt", () => {
    expect(pendingTrialReminder({ ...base, billingExempt: true })).toBeNull();
    expect(pendingTrialReminder({ ...base, stripeSubId: "sub_1" })).toBeNull();
    expect(pendingTrialReminder({ ...base, trialEndsAt: null })).toBeNull();
  });

  it("ignoriert expired älter als 3 Tage", () => {
    expect(pendingTrialReminder({ ...base, trialEndsAt: past(5) })).toBeNull();
  });
});
