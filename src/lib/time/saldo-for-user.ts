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

export type SaldoResult = {
  workedMinutes: number;
  expectedMinutes: number;
  saldoMinutes: number;
};

const EMPTY_SALDO: SaldoResult = { workedMinutes: 0, expectedMinutes: 0, saldoMinutes: 0 };

/**
 * Batch-Variante von `calculateSaldoForUser` für mehrere Mitarbeiter.
 *
 * Performance: Statt 2×N Queries (1 User + 1 WorkLog pro Mitarbeiter) genau **2**
 * Queries (alle User + alle WorkLogs der Liste), danach Gruppierung im Speicher.
 * Die Saldo-Semantik ist identisch zur Einzelfunktion.
 *
 * Liefert für jede angefragte (existierende) userId ein Ergebnis; unbekannte
 * IDs fehlen im Ergebnis-Record (Caller entscheidet über Fallback).
 */
export async function calculateSaldosForUsers(
  companyId: string,
  userIds: string[],
): Promise<Record<string, SaldoResult>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return {};

  const [users, logs] = await Promise.all([
    db.user.findMany({
      where: tenantWhere(companyId, { id: { in: unique } }),
      select: { id: true, weeklyHours: true },
    }),
    db.workLog.findMany({
      where: tenantWhere(companyId, { userId: { in: unique }, clockOut: { not: null } }),
      orderBy: { clockIn: "asc" },
      select: { userId: true, clockIn: true, clockOut: true, breakMins: true },
    }),
  ]);

  const logsByUser = new Map<string, Array<{ clockIn: Date; clockOut: Date | null; breakMins: number }>>();
  for (const log of logs) {
    const list = logsByUser.get(log.userId);
    if (list) list.push(log);
    else logsByUser.set(log.userId, [log]);
  }

  const result: Record<string, SaldoResult> = {};
  for (const user of users) {
    const userLogs = logsByUser.get(user.id) ?? [];
    const workedMinutes = sumWorkedMinutes(userLogs);
    // logs sind aufsteigend nach clockIn sortiert → erstes Element = frühester Stempel.
    const firstLog = userLogs[0]?.clockIn;
    if (!firstLog) {
      result[user.id] = { ...EMPTY_SALDO };
      continue;
    }
    const weeksSinceStart = (Date.now() - firstLog.getTime()) / (1000 * 60 * 60 * 24 * 7);
    const expectedMinutes = Math.round(weeksSinceStart * user.weeklyHours * 60);
    result[user.id] = {
      workedMinutes,
      expectedMinutes,
      saldoMinutes: workedMinutes - expectedMinutes,
    };
  }

  return result;
}
