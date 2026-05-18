import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { PLANS } from "@/lib/stripe";
import {
  TRIAL_MAX_EMPLOYEES,
  hasPaidSubscription,
  isInAppTrial,
  isTrialExpired,
  type CompanyTrialFields,
} from "@/lib/trial";

export type CompanyPlan = keyof typeof PLANS;

export function getPlanLimits(plan: string) {
  const key = (plan in PLANS ? plan : "STARTER") as CompanyPlan;
  return PLANS[key].limits;
}

export function canExportPdf(plan: string): boolean {
  return getPlanLimits(plan).pdfExport;
}

export function canEmailPayroll(plan: string): boolean {
  return getPlanLimits(plan).payrollEmail;
}

/**
 * QR-Code fürs Terminal-Tablet.
 * Vorbereitet, standardmäßig aus: `VREMA_FEATURE_QR_TERMINAL=plan` (oder `all` zum Testen).
 * Ohne Env oder `off`/`false`: für niemanden sichtbar — Freischaltung nach Bedarf.
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
  if (plan === "BUSINESS") return "Business";
  if (plan === "ENTERPRISE") return "Enterprise";
  return "Starter";
}

export async function countActiveEmployees(companyId: string): Promise<number> {
  return db.user.count({
    where: tenantWhere(companyId, {
      isActive: true,
      email: { not: { endsWith: "@vrema.local" } },
    }),
  });
}

async function getCompanyTrialFields(companyId: string): Promise<CompanyTrialFields | null> {
  return db.company.findUnique({
    where: { id: companyId },
    select: { trialEndsAt: true, stripeSubId: true, subEndsAt: true },
  });
}

/** Effektives MA-Limit inkl. Testphase (3) vs. Plan (10/100/∞). */
export async function getEffectiveEmployeeLimit(companyId: string, plan: string): Promise<number> {
  const company = await getCompanyTrialFields(companyId);
  const planLimit = maxEmployees(plan);

  if (!company) return planLimit;
  if (hasPaidSubscription(company)) return planLimit;
  if (isInAppTrial(company)) return TRIAL_MAX_EMPLOYEES;
  if (isTrialExpired(company)) {
    const current = await countActiveEmployees(companyId);
    return current;
  }
  return planLimit;
}

/** Serverseitiges Gate vor neuen Mitarbeitenden (Invite, CSV, …). */
export async function assertCanAddEmployees(
  companyId: string,
  plan: string,
  additional = 1,
): Promise<void> {
  const company = await getCompanyTrialFields(companyId);
  const limit = await getEffectiveEmployeeLimit(companyId, plan);
  if (!Number.isFinite(limit)) return;

  const current = await countActiveEmployees(companyId);
  if (current + additional > limit) {
    if (company && isTrialExpired(company)) {
      throw new Error(
        "Deine Testphase ist abgelaufen. Bitte wähle unter Abonnement einen Tarif, um weitere Mitarbeitende einzuladen.",
      );
    }
    if (company && isInAppTrial(company)) {
      throw new Error(
        `Testphase: maximal ${TRIAL_MAX_EMPLOYEES} aktive Mitarbeitende (aktuell ${current}). Nach dem Tarifwechsel gelten die Limits deines Plans.`,
      );
    }
    throw new Error(
      `Plan-Limit: ${planDisplayName(plan)} erlaubt maximal ${limit} aktive Mitarbeitende (aktuell ${current}). Bitte Tarif wechseln unter Abonnement.`,
    );
  }
}

export function assertPlanFeature(
  plan: string,
  feature: "pdfExport" | "payrollEmail" | "datevExport",
): void {
  const limits = getPlanLimits(plan);
  if (feature === "pdfExport" && !limits.pdfExport) {
    throw new Error("PDF-Export ist ab dem Business-Tarif verfügbar.");
  }
  if (feature === "payrollEmail" && !limits.payrollEmail) {
    throw new Error("E-Mail an das Lohnbüro ist ab dem Business-Tarif verfügbar.");
  }
  if (feature === "datevExport" && !limits.pdfExport) {
    throw new Error("DATEV-Export ist ab dem Business-Tarif verfügbar.");
  }
}
