"use server";

import { db } from "@/lib/db";
import {
  companyModulesFromRow,
  type CompanyModuleKey,
  type CompanyModules,
} from "@/lib/company-modules";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import { revalidatePath } from "next/cache";

const MODULE_SELECT = {
  industry: true,
  modulePeaks: true,
  modulePlannerWeather: true,
  moduleShiftTrade: true,
  moduleShiftTasks: true,
  moduleAutopilot: true,
} as const;

export async function getCompanyModulesForTenant(): Promise<CompanyModules> {
  const { companyId, role } = await requireTenant();
  if (role === "AFFILIATE_PARTNER" || role === "SUPPORT") {
    return {
      peaks: false,
      plannerWeather: false,
      shiftTrade: false,
      shiftTasks: false,
      autopilot: false,
    };
  }

  const row = await db.company.findUnique({
    where: { id: companyId },
    select: MODULE_SELECT,
  });
  if (!row) {
    return {
      peaks: false,
      plannerWeather: false,
      shiftTrade: true,
      shiftTasks: false,
      autopilot: false,
    };
  }
  return companyModulesFromRow(row);
}

export async function updateCompanyModules(input: Partial<Record<CompanyModuleKey, boolean>>) {
  const { companyId, role } = await requireTenant();
  if (role !== "COMPANY_OWNER" && role !== "SUPER_ADMIN") {
    throw new Error("Keine Berechtigung.");
  }

  const data: Record<string, boolean> = {};
  if (input.peaks !== undefined) data.modulePeaks = input.peaks;
  if (input.plannerWeather !== undefined) data.modulePlannerWeather = input.plannerWeather;
  if (input.shiftTrade !== undefined) data.moduleShiftTrade = input.shiftTrade;
  if (input.shiftTasks !== undefined) data.moduleShiftTasks = input.shiftTasks;
  if (input.autopilot !== undefined) data.moduleAutopilot = input.autopilot;

  if (Object.keys(data).length === 0) {
    throw new Error("Keine Änderungen.");
  }

  await db.company.update({
    where: { id: companyId },
    data,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard/insights");
  revalidatePath("/dashboard/peaks");
}
