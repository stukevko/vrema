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

export const BUSINESS_UPGRADE_PATH = "/dashboard/billing?upgrade=business";
export const TRIAL_UPGRADE_PATH = "/dashboard/billing";
export const TRIAL_EXPIRED_PATH = "/dashboard/billing?trial_expired=1";

export type UpgradeReason =
  | { kind: "trial_employee_limit" }
  | { kind: "starter_employee_limit"; limit: number }
  | { kind: "business_feature"; feature: GatedBusinessFeature }
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

/** Copy für Conversion-Sheet — ein Klick, kein Kleingedrucktes. */
export function upgradeSheetContent(reason: UpgradeReason): UpgradeSheetContent {
  switch (reason.kind) {
    case "trial_employee_limit":
      return {
        eyebrow: "Testphase",
        title: `${TRIAL_MAX_EMPLOYEES} Plätze sind voll`,
        body: `Ein Klick — Tarif wählen — bis zu 10 Mitarbeitende ab 29 €/Monat. Kein Neu-Setup, Team bleibt wie es ist.`,
        cta: "Tarif wählen — weiter einladen",
        href: TRIAL_UPGRADE_PATH,
        secondary: "Wie Clockin: klicken statt nachdenken. Hier einmal Tarif, dann läuft alles.",
      };
    case "starter_employee_limit":
      return {
        eyebrow: "Team wächst",
        title: `Starter erlaubt ${reason.limit} Mitarbeitende`,
        body: "Business schaltet bis zu 100 Plätze plus PDF, Lohnbüro und DATEV frei — ein Klick.",
        cta: "Business freischalten",
        href: BUSINESS_UPGRADE_PATH,
      };
    case "business_feature":
      return {
        eyebrow: "Business",
        title: `${businessFeatureLabel(reason.feature)} — ein Klick`,
        body: "Kein Export-Chaos mehr: PDF, DATEV und Versand ans Lohnbüro ab 79 €/Monat. Einmal upgraden, jeden Monat Zeit sparen.",
        cta: "Business aktivieren",
        href: BUSINESS_UPGRADE_PATH,
        secondary: "Du klickst — VREMA liefert die Unterlagen.",
      };
    case "trial_expired":
      return {
        eyebrow: "Testphase",
        title: "Testphase vorbei — ein Klick zurück",
        body: "Tarif wählen und sofort weiter stempeln und planen. Nichts geht verloren.",
        cta: "Jetzt Tarif wählen",
        href: TRIAL_EXPIRED_PATH,
      };
    case "trial_ending":
      return {
        eyebrow: "Testphase",
        title:
          reason.daysRemaining <= 1
            ? "Letzter Tag — ein Klick sichert alles"
            : `Noch ${reason.daysRemaining} Tage — rechtzeitig klicken`,
        body: "Ohne Tarif stoppt Stempeln und Planung. Ein Klick auf Billing — fertig.",
        cta: "Tarif sichern",
        href: TRIAL_UPGRADE_PATH,
      };
  }
}

export function businessUpgradeToast(feature: GatedBusinessFeature): string {
  return upgradeSheetContent({ kind: "business_feature", feature }).title;
}

/** Erkennt Server-Fehlertexte für Upgrade-Sheet (Invite, CSV, …). */
export function upgradeReasonFromErrorMessage(message: string): UpgradeReason | null {
  if (message.includes("Testphase") && message.includes("Mitarbeitende")) {
    return { kind: "trial_employee_limit" };
  }
  if (message.includes("Testphase ist abgelaufen")) {
    return { kind: "trial_expired" };
  }
  if (message.includes("Plan-Limit")) {
    const m = message.match(/maximal (\d+)/);
    return { kind: "starter_employee_limit", limit: m ? Number(m[1]) : 10 };
  }
  if (message.includes("Business-Tarif") || message.includes("PDF-Export")) {
    return { kind: "business_feature", feature: "pdf" };
  }
  return null;
}
