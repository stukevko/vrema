/**
 * Einheitliche Formate für Lohnbüro-Exporte (PDF, CSV, DATEV).
 * Ziel: lesbare Abrechnungsdokumente — keine Rohdaten- oder Code-Optik.
 */

export const PAYROLL_DISPLAY_TZ = "Europe/Berlin";

/** TT.MM.JJJJ — Standard für deutsche Lohnabrechnung / Excel. */
export function formatPayrollDateDE(value: Date): string {
  return value.toLocaleDateString("de-DE", {
    timeZone: PAYROLL_DISPLAY_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** ISO-Kalendertag (YYYY-MM-DD) → TT.MM.JJJJ */
export function isoDateKeyToPayrollDE(isoKey: string): string {
  const m = isoKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return isoKey;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/** Minuten → Dezimalstunden mit Komma (z. B. 90 → "1,50"). */
export function formatPayrollHoursDE(minutes: number, fractionDigits = 2): string {
  const normalized = Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : 0;
  const hours = normalized / 60;
  return hours.toFixed(fractionDigits).replace(".", ",");
}

/** PDF/CSV-Kopf: Firmenname oder neutraler Titel. */
export function payrollDocumentTitle(companyName: string): string {
  const t = companyName.trim();
  if (!t || /^kevkostudio$/i.test(t)) return "Betrieb";
  return t;
}

/** Dateiname-Segment ohne Sonderzeichen. */
export function payrollFileSlug(companyName: string, maxLen = 28): string {
  return (companyName.trim() || "betrieb")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9äöüÄÖÜß\-]/g, "")
    .slice(0, maxLen)
    .toLowerCase();
}

/** jsPDF: Umlaute in ASCII (Helvetica-Standardfonts). */
export function pdfAsciiSafe(text: string): string {
  return text
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss");
}
