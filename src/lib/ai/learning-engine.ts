/**
 * VREMA Neural Engine · Learning Engine
 * ──────────────────────────────────────
 *
 * Sammelt Telemetrie zwischen Vorschlag (Heuristik / Modell) und Realität.
 *
 *  Ehrlicher Hinweis: dies ist NICHT „Training" im ML-Sinn. Wir speichern
 *  strukturierte Plan-vs-Realität-Datensätze, die später ein echtes Training-
 *  oder Kalibrierungs-Run anstoßen kann. Heute ist es RAG-Brennstoff +
 *  Auditing für den Owner.
 *
 *  Alle Funktionen sind Tenant-strikt: nichts wird ohne `companyId` geschrieben.
 */

import { Prisma, type AiTelemetryKind } from "@prisma/client";
import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";

export type SuggestionVsReality<TS, TA> = {
  suggestion: TS;
  actual: TA;
};

/**
 *  Erfasst einen neuen Telemetrie-Eintrag.
 *  `metrics` ist optional – wenn nicht übergeben, berechnet die Funktion eine
 *  generische deltaPct-Kennzahl, falls Vorschlag/Realität numerisch vergleichbar sind.
 */
export async function recordTelemetry(input: {
  companyId: string;
  kind: AiTelemetryKind;
  modelTag: string;
  suggestion: Prisma.InputJsonValue;
  actual?: Prisma.InputJsonValue | null;
  metrics?: Prisma.InputJsonValue | null;
  referenceDate?: Date | null;
}): Promise<{ id: string }> {
  const row = await db.aiTelemetry.create({
    data: {
      companyId: input.companyId,
      kind: input.kind,
      modelTag: input.modelTag,
      suggestion: input.suggestion,
      actual: input.actual ?? Prisma.JsonNull,
      metrics: input.metrics ?? Prisma.JsonNull,
      referenceDate: input.referenceDate ?? null,
      closedAt: input.actual != null ? new Date() : null,
    },
    select: { id: true },
  });
  return row;
}

/**
 *  Schließt einen früher angelegten Vorschlags-Datensatz mit der Realität nach.
 *  Wir lassen `suggestion` unverändert und füllen `actual` + `metrics`.
 */
export async function closeTelemetry(input: {
  companyId: string;
  id: string;
  actual: Prisma.InputJsonValue;
  metrics?: Prisma.InputJsonValue | null;
}): Promise<void> {
  // Tenant-Hardening: NIE per ID alleine updaten.
  const existing = await db.aiTelemetry.findFirst({
    where: tenantWhere(input.companyId, { id: input.id }),
    select: { id: true },
  });
  if (!existing) throw new Error("Telemetrie-Eintrag gehört nicht zu dieser Firma.");

  await db.aiTelemetry.update({
    where: { id: existing.id },
    data: {
      actual: input.actual,
      metrics: input.metrics ?? Prisma.JsonNull,
      closedAt: new Date(),
    },
  });
}

/**
 *  Liest die letzten N geschlossenen Telemetrie-Datensätze eines Kinds.
 *  Wird vom Recommendation-Engine als „Few-Shot-Beispiele" eingespeist —
 *  das Modell lernt aus den eigenen Treffern und Fehlern.
 */
export async function listRecentClosed(
  companyId: string,
  kind: AiTelemetryKind,
  limit = 10,
) {
  return db.aiTelemetry.findMany({
    where: tenantWhere(companyId, { kind, closedAt: { not: null } }),
    orderBy: { closedAt: "desc" },
    take: limit,
    select: {
      id: true,
      modelTag: true,
      suggestion: true,
      actual: true,
      metrics: true,
      referenceDate: true,
      closedAt: true,
    },
  });
}

/**
 *  Plan-vs-Realität für eine Wochenplanung berechnen und speichern.
 *  Wird vom Schicht-Planer aufgerufen, sobald eine Woche „echt" gelaufen ist.
 */
export async function recordShiftPlanDeviation(input: {
  companyId: string;
  weekStartDate: Date;
  /** Erwartete (geplante) Schichten pro Wochentag (0..6). */
  plannedByDow: Record<number, number>;
  /** Tatsächlich aufgetretene Schichten/WorkLogs pro Wochentag. */
  actualByDow: Record<number, number>;
  modelTag?: string;
}): Promise<void> {
  // Metrics berechnen
  let rmseSum = 0;
  let absDeviationSum = 0;
  let n = 0;
  for (let dow = 0; dow < 7; dow++) {
    const planned = input.plannedByDow[dow] ?? 0;
    const actual = input.actualByDow[dow] ?? 0;
    rmseSum += Math.pow(planned - actual, 2);
    absDeviationSum += Math.abs(planned - actual);
    n += 1;
  }
  const rmse = Math.sqrt(rmseSum / Math.max(1, n));
  const mae = absDeviationSum / Math.max(1, n);

  await recordTelemetry({
    companyId: input.companyId,
    kind: "SHIFT_PLAN_DEVIATION",
    modelTag: input.modelTag ?? "heuristic-v2",
    suggestion: { planned: input.plannedByDow as unknown as Prisma.InputJsonValue },
    actual: { actual: input.actualByDow as unknown as Prisma.InputJsonValue },
    metrics: { rmse: Math.round(rmse * 100) / 100, mae: Math.round(mae * 100) / 100 } as Prisma.InputJsonValue,
    referenceDate: input.weekStartDate,
  });
}

/**
 *  Aggregierte Genauigkeit über die letzten Plan-vs-Realität-Datensätze.
 *  Wird im Dashboard als „Modell-Treffsicherheit" angezeigt.
 */
export async function getAccuracySummary(
  companyId: string,
  kind: AiTelemetryKind = "SHIFT_PLAN_DEVIATION",
): Promise<{ samples: number; avgMae: number | null; avgRmse: number | null }> {
  const rows = await db.aiTelemetry.findMany({
    where: tenantWhere(companyId, { kind, closedAt: { not: null } }),
    orderBy: { closedAt: "desc" },
    take: 12,
    select: { metrics: true },
  });
  let maeSum = 0;
  let rmseSum = 0;
  let count = 0;
  for (const r of rows) {
    const m = (r.metrics as { rmse?: number; mae?: number } | null) ?? null;
    if (m && typeof m.mae === "number" && typeof m.rmse === "number") {
      maeSum += m.mae;
      rmseSum += m.rmse;
      count += 1;
    }
  }
  return {
    samples: count,
    avgMae: count > 0 ? Math.round((maeSum / count) * 100) / 100 : null,
    avgRmse: count > 0 ? Math.round((rmseSum / count) * 100) / 100 : null,
  };
}

