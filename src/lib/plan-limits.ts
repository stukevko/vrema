import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { PLANS } from "@/lib/plans";
import {
  TRIAL_MAX_EMPLOYEES,
  hasPaidSubscription,
  isBillingExempt,
  isInAppTrial,
  isTrialExpired,
  type CompanyTrialFields,
} from "@/lib/trial";
import {
  assertPlanFeature,
  maxEmployees,
  normalizePlan,
  planDisplayName,
  type CompanyPlan,
} from "@/lib/plan-features";

export type { CompanyPlan };
export {
  assertPlanFeature,
  canEmailPayroll,
  canExportPdf,
  canUseCustomBranding,
  canUseQrTerminal,
  getPlanLimits,
  maxEmployees,
  normalizePlan,
  planDisplayName,
} from "@/lib/plan-features";

export async function countActiveEmployees(companyId: string): Promise<number> {
  return db.user.count({
    where: tenantWhere(companyId, {
      isActive: true,
      role: { not: UserRole.ADVISOR },
      email: { not: { endsWith: "@vrema.local" } },
    }),
  });
}

async function getCompanyTrialFields(companyId: string): Promise<CompanyTrialFields | null> {
  return db.company.findUnique({
    where: { id: companyId },
    select: { trialEndsAt: true, billingExempt: true, tenantStatus: true, isActive: true },
  });
}

/** Effektives MA-Limit inkl. Testphase (3) vs. Plan (50/∞). */
export async function getEffectiveEmployeeLimit(companyId: string, plan: string): Promise<number> {
  const company = await getCompanyTrialFields(companyId);
  const planLimit = maxEmployees(plan);

  if (!company) return planLimit;
  if (isBillingExempt(company) || hasPaidSubscription(company)) return planLimit;
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
        "Deine Testphase ist abgelaufen. Bitte Zugang unter Abonnement anfragen, um weitere Mitarbeitende einzuladen.",
      );
    }
    if (company && isInAppTrial(company)) {
      throw new Error(
        `Testphase: maximal ${TRIAL_MAX_EMPLOYEES} aktive Mitarbeitende (aktuell ${current}). Nach dem Tarifwechsel gelten die Limits deines Plans.`,
      );
    }
    const normalized = normalizePlan(plan);
    if (normalized === "PETITE" && limit === PLANS.PETITE.limits.employees) {
      throw new Error(
        `Plan-Limit: Petite erlaubt maximal ${limit} Mitarbeitende (aktuell ${current}). Ab 51 MA bitte Major (90 €/Monat) unter Abonnement wählen.`,
      );
    }
    throw new Error(
      `Plan-Limit: ${planDisplayName(plan)} erlaubt maximal ${limit} aktive Mitarbeitende (aktuell ${current}). Bitte Tarif wechseln unter Abonnement.`,
    );
  }
}
