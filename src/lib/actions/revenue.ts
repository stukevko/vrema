"use server";

import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant-guard";
import { revalidatePath } from "next/cache";

export type RevenueImportResult = {
  weeksParsed: number;
  averageEuro: number;
  message: string;
};

/**
 * CSV: eine Zeile pro Woche — „Umsatz“ oder „2025-05-12,8500“ (Datum optional).
 * Aktualisiert den geschätzten Wochenumsatz (Durchschnitt der gültigen Werte).
 */
export async function importWeeklyRevenueCsv(csvText: string): Promise<RevenueImportResult> {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^umsatz|woche|week/i.test(l));

  const values: number[] = [];
  for (const line of lines) {
    const parts = line.split(/[;,|\t]/).map((p) => p.trim());
    const numRaw = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    const n = Number(String(numRaw).replace(/\s/g, "").replace(",", "."));
    if (Number.isFinite(n) && n > 0) values.push(n);
  }

  if (values.length === 0) {
    throw new Error("Keine gültigen Umsatz-Zahlen gefunden. Beispiel: 8500 oder 2025-05-12;9200");
  }

  const averageEuro = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;

  await db.company.update({
    where: { id: companyId },
    data: { estimatedWeeklyRevenue: averageEuro },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/planning");

  return {
    weeksParsed: values.length,
    averageEuro,
    message: `${values.length} Woche(n) importiert — Ø ${averageEuro.toLocaleString("de-DE")} €/Woche gespeichert.`,
  };
}
