"use server";

import { auth } from "@/auth";
import { requireTenant } from "@/lib/tenant-guard";
import { getNeuralRecommendations, type RecommendationBundle } from "@/lib/ai/recommend";
import { getAccuracySummary } from "@/lib/ai/learning-engine";

/**
 *  Liefert Empfehlungen für das aktuelle Tenant.
 *  Nur Manager-Rollen dürfen das Modell konsumieren (kostet RAM/CPU).
 */
export async function getNeuralRecommendationsForOwner(): Promise<RecommendationBundle> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }
  return getNeuralRecommendations(companyId);
}

/**
 *  Treffsicherheits-Übersicht der bisherigen Plan-vs-Realität-Telemetrie.
 */
export async function getNeuralAccuracy() {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }
  return getAccuracySummary(companyId);
}
