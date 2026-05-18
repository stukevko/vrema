"use server";

import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import { db } from "@/lib/db";
import { getMonthBoundsUtc } from "@/lib/time/timezone";

export type DatevLohnart = "STANDARD" | "NACHT";

export type DatevExportRow = {
  employeeId: string;
  date: string;
  netWorkMinutes: number;
  breakMinutes: number;
  wageType: DatevLohnart;
};

/** All report bucketing uses Europe/Berlin (DST-safe day/month bounds). */
const DISPLAY_TZ = "Europe/Berlin";

function workedMinutes(clockIn: Date, clockOut: Date | null, breakMins: number) {
  if (!clockOut) return 0;
  const gross = Math.max(0, Math.round((clockOut.getTime() - clockIn.getTime()) / 60000));
  return Math.max(0, gross - Math.max(0, breakMins));
}

/**
 * Stable sortable calendar key YYYY-MM-DD in Berlin (not for end-user UI).
 * Locale "en-CA" yields ISO-like parts regardless of server default locale.
 */
function toBerlinDateKey(date: Date) {
  return date.toLocaleDateString("en-CA", {
    timeZone: DISPLAY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getBerlinHour24(date: Date): number {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: DISPLAY_TZ,
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value;
  const n = Number(hour);
  return Number.isFinite(n) ? n : 0;
}

function inferWageType(clockIn: Date, clockOut: Date | null): DatevLohnart {
  const startHour = getBerlinHour24(clockIn);
  const endHour = clockOut ? getBerlinHour24(clockOut) : startHour;
  const touchesNight = startHour >= 22 || startHour < 6 || endHour >= 22 || endHour < 6;
  return touchesNight ? "NACHT" : "STANDARD";
}

export async function prepareDatevExportData(monthKey: string): Promise<DatevExportRow[]> {
  const { companyId, role, userId } = await requireTenant();
  const canReadAll = ["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role);
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) throw new Error("Ungültiger Monat. Erwartet: YYYY-MM");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const { start, endExclusive } = getMonthBoundsUtc(year, month, DISPLAY_TZ);

  const logs = await db.workLog.findMany({
    where: tenantWhere(companyId, {
      ...(canReadAll ? {} : { userId }),
      clockIn: { gte: start, lt: endExclusive },
    }),
    orderBy: { clockIn: "asc" },
    select: {
      userId: true,
      clockIn: true,
      clockOut: true,
      breakMins: true,
      user: {
        select: {
          employeeNumber: true,
        },
      },
    },
  });

  return logs.map((log) => ({
    employeeId: log.user.employeeNumber?.trim() || `FEHLT_${log.userId.slice(-8).toUpperCase()}`,
    date: toBerlinDateKey(log.clockIn),
    netWorkMinutes: workedMinutes(log.clockIn, log.clockOut, log.breakMins),
    breakMinutes: Math.max(0, log.breakMins),
    wageType: inferWageType(log.clockIn, log.clockOut),
  }));
}

function csvCell(value: string | number) {
  const text = String(value ?? "");
  if (!/[;"\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function generateDatevCsv(data: DatevExportRow[]) {
  const separator = ";";
  const header = [
    "Personalnummer",
    "Datum",
    "Arbeitszeit_Minuten",
    "Pause_Minuten",
    "Lohnart",
  ];
  const rows = data.map((row) => [
    row.employeeId,
    row.date,
    row.netWorkMinutes,
    row.breakMinutes,
    row.wageType,
  ]);
  return [header.map(csvCell).join(separator), ...rows.map((r) => r.map(csvCell).join(separator))].join("\n");
}

export async function exportDatevCsvAction(monthKey: string) {
  const { companyId, role, plan } = await requireTenant();
  const canExport = role === "COMPANY_OWNER" || role === "SUPER_ADMIN";
  if (!canExport) {
    throw new Error("Keine Berechtigung für DATEV-Export.");
  }
  const { assertPlanFeature } = await import("@/lib/plan-limits");
  assertPlanFeature(plan ?? "STARTER", "datevExport");
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  });
  const rows = await prepareDatevExportData(monthKey);
  const csv = await generateDatevCsv(rows);
  const [year, month] = monthKey.split("-");
  const safeCompany = (company?.name ?? "FIRMA").trim().replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
  const fileName = `VREMA_Lohnexport_${safeCompany || "FIRMA"}_${year}-${month}.csv`;
  return { csv, fileName, rowsCount: rows.length };
}

