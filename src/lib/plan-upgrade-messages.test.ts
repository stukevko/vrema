import { describe, expect, it } from "vitest";
import {
  upgradeSheetContent,
  upgradeReasonFromErrorMessage,
  businessFeatureLabel,
} from "@/lib/plan-upgrade-messages";

describe("upgradeSheetContent", () => {
  it("trial limit hat klaren CTA", () => {
    const c = upgradeSheetContent({ kind: "trial_employee_limit" });
    expect(c.cta).toContain("Tarif");
    expect(c.href).toContain("/dashboard/billing");
  });

  it("business feature nennt Feature", () => {
    const c = upgradeSheetContent({ kind: "business_feature", feature: "pdf" });
    expect(c.title).toContain(businessFeatureLabel("pdf"));
  });
});

describe("upgradeReasonFromErrorMessage", () => {
  it("erkennt Testphase MA-Limit", () => {
    expect(
      upgradeReasonFromErrorMessage("Testphase: maximal 3 aktive Mitarbeitende"),
    ).toEqual({ kind: "trial_employee_limit" });
  });

  it("erkennt abgelaufene Testphase", () => {
    expect(
      upgradeReasonFromErrorMessage("Deine Testphase ist abgelaufen. Bitte wähle"),
    ).toEqual({ kind: "trial_expired" });
  });
});
