"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import { detectInsights, type Insight } from "@/lib/ai/insights";
import { DIMENSIONS } from "@/lib/ai/core-engine";

const CAN_VIEW = new Set(["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"]);

/**
 *  Liefert die aktuelle Insight-Liste für den Owner/Manager.
 *  Latenz typischerweise < 200 ms (4 parallele Detektoren).
 */
export async function getInsightsForOwner(): Promise<Insight[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const { companyId, role } = await requireTenant();
  if (!CAN_VIEW.has(role ?? "")) {
    throw new Error("Keine Berechtigung für Insights.");
  }
  return detectInsights(companyId);
}

export type WeightAuditEntry = {
  dimension: string;
  key: string;
  weight: number;
  sampleCount: number;
  lastError: number | null;
  updatedAt: string;
};

/**
 *  Audit-View: Liste aller gelernten Faktoren.
 *  Wichtig für DSGVO-Auditoren und für den Owner, der nachvollziehen will,
 *  was die KI "weiß".
 */
export async function getAiWeightsAudit(): Promise<WeightAuditEntry[]> {
  const { companyId, role } = await requireTenant();
  if (!CAN_VIEW.has(role ?? "")) {
    throw new Error("Keine Berechtigung.");
  }

  const rows = await db.aiWeights.findMany({
    where: tenantWhere(companyId),
    orderBy: [{ dimension: "asc" }, { key: "asc" }],
    select: {
      dimension: true,
      key: true,
      weight: true,
      sampleCount: true,
      lastError: true,
      updatedAt: true,
    },
  });
  return rows.map((r) => ({
    dimension: r.dimension,
    key: r.key,
    weight: r.weight,
    sampleCount: r.sampleCount,
    lastError: r.lastError,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

/**
 *  Reset eines spezifischen Faktors auf 1.0 (manueller Override).
 *  Wird vom Owner genutzt, wenn er fühlt, dass das System "zu viel gelernt" hat.
 */
export async function resetAiWeight(input: { dimension: string; key: string }): Promise<void> {
  const { companyId, role } = await requireTenant();
  if (!CAN_VIEW.has(role ?? "")) {
    throw new Error("Keine Berechtigung.");
  }
  // Nur bekannte Dimensionen erlauben.
  const known = Object.values(DIMENSIONS) as string[];
  if (!known.includes(input.dimension)) {
    throw new Error("Unbekannte Dimension.");
  }

  await db.aiWeights.upsert({
    where: {
      companyId_dimension_key: {
        companyId,
        dimension: input.dimension,
        key: input.key,
      },
    },
    create: {
      companyId,
      dimension: input.dimension,
      key: input.key,
      weight: 1.0,
      sampleCount: 0,
      lastError: null,
    },
    update: {
      weight: 1.0,
      sampleCount: 0,
      lastError: null,
    },
  });
}
