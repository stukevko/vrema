import { describe, expect, it } from "vitest";
import {
  upgradeSheetContent,
  upgradeReasonFromErrorMessage,
} from "@/lib/plan-upgrade-messages";
import { PLANS } from "@/lib/plans";

describe("upgradeSheetContent", () => {
  it("trial limit hat klaren CTA", () => {
    const c = upgradeSheetContent({ kind: "trial_employee_limit" });
    expect(c.cta).toContain("anfragen");
    expect(c.href).toContain("/dashboard/billing");
  });

  it("petite limit nennt Major", () => {
    const c = upgradeSheetContent({ kind: "petite_employee_limit", limit: PLANS.PETITE.limits.employees });
    expect(c.title).toContain(String(PLANS.PETITE.limits.employees));
    expect(c.cta).toContain("Major");
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

  it("erkennt Petite-Limit für Major-Upgrade", () => {
    expect(
      upgradeReasonFromErrorMessage("Plan-Limit: Petite erlaubt maximal 50 Mitarbeitende. Ab 51 MA bitte Major"),
    ).toEqual({ kind: "petite_employee_limit", limit: 50 });
  });
});
