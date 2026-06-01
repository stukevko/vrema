import { describe, expect, it } from "vitest";
import {
  FLYER_TRIAL_DAYS,
  addDays,
  computeFlyerTrialEndsAt,
  flyerReferralDisplayName,
  isFlyerReferralCode,
  normalizeReferralCode,
} from "@/lib/trial/referral";

describe("normalizeReferralCode", () => {
  it("trimmt, lowercased und begrenzt auf 80 Zeichen", () => {
    expect(normalizeReferralCode("  SPEYER  ")).toBe("speyer");
    expect(normalizeReferralCode("Speyer-Altstadt")).toBe("speyer-altstadt");
    expect(normalizeReferralCode("a".repeat(200))).toHaveLength(80);
  });

  it("leerer/whitespace Code → leerer String", () => {
    expect(normalizeReferralCode("   ")).toBe("");
  });
});

describe("isFlyerReferralCode", () => {
  it("erkennt Speyer-Kampagnen", () => {
    expect(isFlyerReferralCode("speyer")).toBe(true);
    expect(isFlyerReferralCode("SPEYER")).toBe(true);
    expect(isFlyerReferralCode("speyer-altstadt")).toBe(true);
    expect(isFlyerReferralCode("speyer_dom")).toBe(true);
  });

  it("lehnt fremde Codes ab", () => {
    expect(isFlyerReferralCode("berlin")).toBe(false);
    expect(isFlyerReferralCode("")).toBe(false);
    expect(isFlyerReferralCode("aff_partner123")).toBe(false);
  });
});

describe("addDays / computeFlyerTrialEndsAt", () => {
  it("addDays addiert exakt N Tage", () => {
    const from = new Date("2026-06-01T00:00:00Z");
    expect(addDays(from, 30).toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("FLYER_TRIAL_DAYS sind 30", () => {
    expect(FLYER_TRIAL_DAYS).toBe(30);
  });

  it("computeFlyerTrialEndsAt liegt 30 Tage in der Zukunft", () => {
    const from = new Date("2026-06-01T00:00:00Z");
    expect(computeFlyerTrialEndsAt(from).toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });
});

describe("flyerReferralDisplayName", () => {
  it("Speyer-Codes erhalten sprechenden Namen", () => {
    expect(flyerReferralDisplayName("speyer")).toBe("Speyer Flyer-Aktion");
    expect(flyerReferralDisplayName("speyer-altstadt")).toBe("Speyer Flyer-Aktion");
  });

  it("fremde Codes werden nur normalisiert zurückgegeben", () => {
    expect(flyerReferralDisplayName("Berlin-Mitte")).toBe("berlin-mitte");
  });
});
