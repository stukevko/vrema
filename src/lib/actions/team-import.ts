"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant-guard";
import { inviteEmployeeForCompany } from "@/lib/actions/team";
import { parseCsv, diagnoseRows, type ImportRowDiagnosis } from "@/lib/team/csv-import";

/**
 *  Preview ohne Schreibvorgänge – frontend rendert die Diagnose-Tabelle daraus.
 *  Wichtig: Vorab-Check gegen bestehende User in derselben Firma, damit
 *  die UI „existiert schon"-Banner zeigen kann.
 */
export async function previewTeamImport(csv: string): Promise<{
  rows: ImportRowDiagnosis[];
  okCount: number;
  warnCount: number;
  errorCount: number;
}> {
  const { companyId, role } = await requireTenant();
  if (role !== "COMPANY_OWNER" && role !== "SUPER_ADMIN") {
    throw new Error("Keine Berechtigung.");
  }

  const parsed = parseCsv(csv);
  const diagnosed = diagnoseRows(parsed);

  // E-Mails sammeln, die formell ok wären – gegen DB checken
  const candidateEmails = diagnosed
    .filter((r) => r.status === "ok")
    .map((r) => (r as Extract<ImportRowDiagnosis, { status: "ok" }>).email);

  let existing = new Set<string>();
  if (candidateEmails.length > 0) {
    const found = await db.user.findMany({
      where: { email: { in: candidateEmails } },
      select: { email: true, companyId: true },
    });
    existing = new Set(found.map((u) => u.email));
    // Wir fügen `companyId`-Info nicht an, der UI reicht "schon existent".
    void companyId;
  }

  const augmented: ImportRowDiagnosis[] = diagnosed.map((r) => {
    if (r.status === "ok" && existing.has(r.email)) {
      return { status: "duplicate", name: r.name, email: r.email };
    }
    return r;
  });

  return {
    rows: augmented,
    okCount: augmented.filter((r) => r.status === "ok").length,
    warnCount: augmented.filter((r) => r.status === "duplicate").length,
    errorCount: augmented.filter((r) => r.status === "invalid").length,
  };
}

/**
 *  Führt den Import wirklich aus. Liefert ein einfaches Result-Bundle für Toast/Banner.
 *  Wir importieren sequentiell (nicht parallel), damit Mail-Provider-Limits nicht reißen.
 */
export async function commitTeamImport(csv: string): Promise<{
  imported: number;
  skipped: number;
  failed: number;
  failures: Array<{ email: string; reason: string }>;
}> {
  const { companyId, role } = await requireTenant();
  if (role !== "COMPANY_OWNER" && role !== "SUPER_ADMIN") {
    throw new Error("Keine Berechtigung.");
  }

  const parsed = parseCsv(csv);
  const diagnosed = diagnoseRows(parsed);

  let imported = 0;
  let skipped = 0;
  let failed = 0;
  const failures: Array<{ email: string; reason: string }> = [];

  for (const row of diagnosed) {
    if (row.status === "duplicate" || row.status === "invalid") {
      skipped += 1;
      continue;
    }
    try {
      await inviteEmployeeForCompany(companyId, {
        name: row.name,
        email: row.email,
        role: row.role,
        weeklyHours: row.weeklyHours,
      });
      imported += 1;
    } catch (e) {
      failed += 1;
      failures.push({ email: row.email, reason: e instanceof Error ? e.message : "Unbekannter Fehler" });
    }
  }

  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/settings");

  return { imported, skipped, failed, failures };
}
