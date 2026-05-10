import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { sumWorkedMinutes } from "@/lib/time/payroll";

/**
 * Nur serverintern / Skripte — nicht als Server Action exportieren (kein Session-Zwang).
 *
 * Performance:
 *  - User & Worklogs werden parallel geladen.
 *  - `select` beschränkt auf die wirklich benötigten Felder (vorher kompletter Worklog-Datensatz).
 */
export async function calculateSaldoForUser(companyId: string, userId: string) {
  const [user, logs] = await Promise.all([
    db.user.findFirst({
      where: tenantWhere(companyId, { id: userId }),
      select: { weeklyHours: true },
    }),
    db.workLog.findMany({
      where: tenantWhere(companyId, { userId, clockOut: { not: null } }),
      orderBy: { clockIn: "asc" },
      select: { clockIn: true, clockOut: true, breakMins: true },
    }),
  ]);

  if (!user) throw new Error("Benutzer nicht gefunden.");

  const workedMinutes = sumWorkedMinutes(logs);

  const firstLog = logs[0]?.clockIn;
  if (!firstLog) return { workedMinutes: 0, expectedMinutes: 0, saldoMinutes: 0 };

  const weeksSinceStart = (Date.now() - firstLog.getTime()) / (1000 * 60 * 60 * 24 * 7);
  const expectedMinutes = weeksSinceStart * user.weeklyHours * 60;

  return {
    workedMinutes,
    expectedMinutes: Math.round(expectedMinutes),
    saldoMinutes: workedMinutes - Math.round(expectedMinutes),
  };
}
