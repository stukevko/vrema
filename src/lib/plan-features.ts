import { PLANS, type PlanKey } from "@/lib/plans";

export type CompanyPlan = PlanKey;

/** Legacy-Pläne aus DB vor Migration. */
export function normalizePlan(plan: string): CompanyPlan {
  if (plan === "MAJOR" || plan === "PETITE") return plan;
  if (plan === "BUSINESS" || plan === "ENTERPRISE") return "MAJOR";
  return "PETITE";
}

export function getPlanLimits(plan: string) {
  return PLANS[normalizePlan(plan)].limits;
}

export function canExportPdf(plan: string): boolean {
  return getPlanLimits(plan).pdfExport;
}

export function canEmailPayroll(plan: string): boolean {
  return getPlanLimits(plan).payrollEmail;
}

export function canUseCustomBranding(plan: string): boolean {
  return normalizePlan(plan) === "PETITE" || normalizePlan(plan) === "MAJOR";
}

/**
 * QR-Code fürs Terminal-Tablet.
 * Vorbereitet, standardmäßig aus: `VREMA_FEATURE_QR_TERMINAL=plan` (oder `all` zum Testen).
 */
export function canUseQrTerminal(plan: string): boolean {
  const flag = process.env.VREMA_FEATURE_QR_TERMINAL?.trim().toLowerCase();
  if (!flag || flag === "off" || flag === "false") return false;
  if (flag === "all") return true;
  return getPlanLimits(plan).qrTerminal;
}

export function maxEmployees(plan: string): number {
  return getPlanLimits(plan).employees;
}

export function planDisplayName(plan: string): string {
  return PLANS[normalizePlan(plan)].name;
}

export function assertPlanFeature(
  plan: string,
  feature: "pdfExport" | "payrollEmail" | "datevExport",
): void {
  const limits = getPlanLimits(plan);
  if (feature === "pdfExport" && !limits.pdfExport) {
    throw new Error("PDF-Export ist im Petite-Tarif enthalten — bitte Tarif wählen.");
  }
  if (feature === "payrollEmail" && !limits.payrollEmail) {
    throw new Error("E-Mail ans Lohnbüro ist im Petite-Tarif enthalten — bitte Tarif wählen.");
  }
  if (feature === "datevExport" && !limits.pdfExport) {
    throw new Error("DATEV-Export ist im Petite-Tarif enthalten — bitte Tarif wählen.");
  }
}
