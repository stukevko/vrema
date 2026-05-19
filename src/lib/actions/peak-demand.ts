"use server";

import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant-guard";
import { revalidatePath } from "next/cache";
import {
  DEFAULT_PEAK_DAY_LEVELS,
  normalizePeakDayLevels,
  type PeakDayLevel,
} from "@/lib/planning/peak-demand";

const CAN_EDIT = new Set(["COMPANY_OWNER", "MANAGER", "ADVISOR", "SUPER_ADMIN"]);
const CAN_VIEW = new Set([...CAN_EDIT]);

export type PeakDemandProfile = {
  peakDayLevels: PeakDayLevel[];
  estimatedWeeklyRevenue: number | null;
  updatedAt: string | null;
};

export async function getPeakDemandProfile(): Promise<PeakDemandProfile> {
  const { companyId, role } = await requireTenant();
  if (!CAN_VIEW.has(role ?? "")) throw new Error("Keine Berechtigung.");

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { peakDayLevels: true, estimatedWeeklyRevenue: true, updatedAt: true },
  });

  return {
    peakDayLevels: normalizePeakDayLevels(company?.peakDayLevels ?? DEFAULT_PEAK_DAY_LEVELS),
    estimatedWeeklyRevenue: company?.estimatedWeeklyRevenue ?? null,
    updatedAt: company?.updatedAt?.toISOString() ?? null,
  };
}

export async function savePeakDemandProfile(data: {
  peakDayLevels: PeakDayLevel[];
  estimatedWeeklyRevenue?: number | null;
}) {
  const { companyId, role } = await requireTenant();
  if (!CAN_EDIT.has(role ?? "")) throw new Error("Keine Berechtigung.");

  const levels = normalizePeakDayLevels(data.peakDayLevels);
  const revenue =
    data.estimatedWeeklyRevenue != null && Number.isFinite(data.estimatedWeeklyRevenue)
      ? Math.max(0, Math.round(data.estimatedWeeklyRevenue))
      : data.estimatedWeeklyRevenue === null
        ? null
        : undefined;

  await db.company.update({
    where: { id: companyId },
    data: {
      peakDayLevels: levels,
      ...(revenue !== undefined ? { estimatedWeeklyRevenue: revenue } : {}),
    },
  });

  revalidatePath("/dashboard/peaks");
  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard/insights");
  return { ok: true as const };
}
