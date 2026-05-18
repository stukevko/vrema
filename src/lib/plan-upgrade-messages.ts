export type GatedBusinessFeature = "pdf" | "print" | "payroll" | "datev" | "csv";

const LABELS: Record<GatedBusinessFeature, string> = {
  pdf: "PDF-Export",
  print: "Drucken",
  payroll: "E-Mail an das Lohnbüro",
  datev: "DATEV-Export",
  csv: "CSV-Export",
};

export function businessFeatureLabel(feature: GatedBusinessFeature): string {
  return LABELS[feature];
}

export function businessUpgradeToast(feature: GatedBusinessFeature): string {
  return `${businessFeatureLabel(feature)} ist ab dem Business-Tarif verfügbar (79 €/Monat).`;
}

export const BUSINESS_UPGRADE_PATH = "/dashboard/billing?upgrade=business";
