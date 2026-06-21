import { PLANS } from "@/lib/plans";
import { TRIAL_MAX_EMPLOYEES } from "@/lib/trial/constants";

export type GatedBusinessFeature = "pdf" | "print" | "payroll" | "datev" | "csv";

const FEATURE_LABELS: Record<GatedBusinessFeature, string> = {
  pdf: "PDF-Monatsbericht",
  print: "Drucken",
  payroll: "E-Mail ans Lohnbüro",
  datev: "DATEV-Export",
  csv: "CSV-Export",
};

export function businessFeatureLabel(feature: GatedBusinessFeature): string {
  return FEATURE_LABELS[feature];
}

export const MAJOR_UPGRADE_PATH = "/dashboard/billing?upgrade=major";
/** @deprecated Use MAJOR_UPGRADE_PATH */
export const BUSINESS_UPGRADE_PATH = MAJOR_UPGRADE_PATH;
export const TRIAL_UPGRADE_PATH = "/dashboard/billing";
export const TRIAL_EXPIRED_PATH = "/dashboard/trial-ended";

export type UpgradeReason =
  | { kind: "trial_employee_limit" }
  | { kind: "petite_employee_limit"; limit: number }
  | { kind: "trial_expired" }
  | { kind: "trial_ending"; daysRemaining: number };

export type UpgradeSheetContent = {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  secondary?: string;
};

export function upgradeSheetContent(reason: UpgradeReason): UpgradeSheetContent {
  switch (reason.kind) {
    case "trial_employee_limit":
      return {
        eyebrow: "Testphase",
        title: `${TRIAL_MAX_EMPLOYEES} Plätze sind voll`,
        body: `In der Testphase sind ${TRIAL_MAX_EMPLOYEES} Mitarbeitende drin. Zugang anfragen — Petite schaltet bis zu 50 frei ab ${PLANS.PETITE.monthlyPrice} €/Monat.`,
        cta: "Zugang anfragen",
        href: TRIAL_UPGRADE_PATH,
        secondary: "All-In: PDF, DATEV und Lohnbüro ab dem kleinsten Tarif.",
      };
    case "petite_employee_limit":
      return {
        eyebrow: "Team wächst",
        title: `Petite erlaubt ${reason.limit} Mitarbeitende`,
        body: `Major schaltet unbegrenzte Plätze frei — ab ${PLANS.MAJOR.monthlyPrice} €/Monat, gleiche Features.`,
        cta: "Major anfragen",
        href: MAJOR_UPGRADE_PATH,
      };
    case "trial_expired":
      return {
        eyebrow: "Testphase",
        title: "Testphase vorbei",
        body: "Kurz Zugang anfragen — wir schalten frei und schicken die Rechnung. Nichts geht verloren.",
        cta: "Zugang anfragen",
        href: TRIAL_EXPIRED_PATH,
      };
    case "trial_ending":
      return {
        eyebrow: "Testphase",
        title:
          reason.daysRemaining <= 1
            ? "Letzter Testtag — Zugang rechtzeitig anfragen"
            : `Noch ${reason.daysRemaining} Tage Testphase`,
        body: "Ohne Freischaltung stoppt Stempeln und Planung. Ein Klick — wir melden uns.",
        cta: "Zugang anfragen",
        href: TRIAL_UPGRADE_PATH,
      };
  }
}

/** Erkennt Server-Fehlertexte für Upgrade-Sheet (Invite, CSV, …). */
export function upgradeReasonFromErrorMessage(message: string): UpgradeReason | null {
  if (message.includes("Testphase") && message.includes("Mitarbeitende")) {
    return { kind: "trial_employee_limit" };
  }
  if (message.includes("Testphase ist abgelaufen")) {
    return { kind: "trial_expired" };
  }
  if (message.includes("Ab 51 MA") || message.includes("Major")) {
    const m = message.match(/maximal (\d+)/);
    return { kind: "petite_employee_limit", limit: m ? Number(m[1]) : PLANS.PETITE.limits.employees };
  }
  if (message.includes("Plan-Limit")) {
    const m = message.match(/maximal (\d+)/);
    return { kind: "petite_employee_limit", limit: m ? Number(m[1]) : PLANS.PETITE.limits.employees };
  }
  return null;
}
