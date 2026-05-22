"use server";

import { requireTenant } from "@/lib/tenant-guard";
import { normalizeRecipients, sendPayrollReportInternal } from "@/lib/email/transactional";

/**
 * Versendet den DATEV-/Lohnbüro-Report als E-Mail mit Anhang.
 *
 * Sicherheits-Gates:
 *  1) Authentifizierte Session via `requireTenant()`.
 *  2) Nur Manager / Owner / Super-Admin dürfen die Aktion auslösen.
 *  3) Plan-Gate: nur Business / Enterprise (Starter erlaubt keinen Versand).
 */
export async function sendPayrollReportEmail(data: {
  recipientEmail: string;
  companyName: string;
  month: string;
  totalHours: string;
  entries: number;
  attachmentFileName: string;
  attachmentBase64: string;
  attachmentMimeType?: string;
  attachmentLabel?: string;
  // Legacy-Felder (Compat): einige UI-Pfade nutzen noch csvFileName/csvContent.
  csvFileName?: string;
  csvContent?: string;
}) {
  const { role, plan } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Lohnbüro-Versand ist nur für Inhaber und Manager verfügbar.");
  }
  const { assertPlanFeature } = await import("@/lib/plan-limits");
  assertPlanFeature(plan ?? "STARTER", "payrollEmail");

  const recipients = normalizeRecipients(data.recipientEmail);
  await sendPayrollReportInternal({
    recipients,
    companyName: data.companyName,
    month: data.month,
    totalHours: data.totalHours,
    entries: data.entries,
    attachmentFileName: data.attachmentFileName ?? data.csvFileName ?? "report.pdf",
    attachmentBase64: data.attachmentBase64 ?? data.csvContent ?? "",
    attachmentMimeType: data.attachmentMimeType ?? "application/pdf",
    attachmentLabel: data.attachmentLabel,
  });
}
