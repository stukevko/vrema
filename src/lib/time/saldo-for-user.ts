import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { computeWeeklySaldo, type WeeklySaldoResult } from "@/lib/time/saldo-weekly";
import { getIsoWeekBoundsUtc } from "@/lib/time/timezone";

export type SaldoResult = WeeklySaldoResult;

/**
 * Soll/Ist-Saldo für die **aktuelle ISO-Kalenderwoche** (Mo–So, Europe/Berlin).
 *
 * - Ist: alle Stempelungen dieser Woche (inkl. laufender Schicht).
 * - Soll: `weeklyHours` des Users (volle Wochenarbeitszeit, z. B. 40h).
 */
export async function calculateSaldoForUser(
  companyId: string,
  userId: string,
  reference: Date = new Date(),
): Promise<SaldoResult> {
  const { start, endExclusive } = getIsoWeekBoundsUtc(reference);

  const [user, logs] = await Promise.all([
    db.user.findFirst({
      where: tenantWhere(companyId, { id: userId }),
      select: { weeklyHours: true },
    }),
    db.workLog.findMany({
      where: tenantWhere(companyId, {
        userId,
        clockIn: { gte: start, lt: endExclusive },
      }),
      orderBy: { clockIn: "asc" },
      select: { clockIn: true, clockOut: true, breakMins: true },
    }),
  ]);

  if (!user) throw new Error("Benutzer nicht gefunden.");

  return computeWeeklySaldo({ weeklyHours: user.weeklyHours ?? 0, logs, reference });
}

/** Batch-Variante — eine Woche, zwei Queries (User + WorkLogs). */
export async function calculateSaldosForUsers(
  companyId: string,
  userIds: string[],
  reference: Date = new Date(),
): Promise<Record<string, SaldoResult>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return {};

  const { start, endExclusive } = getIsoWeekBoundsUtc(reference);
  const weekLabel = computeWeeklySaldo({ weeklyHours: 0, logs: [], reference }).weekLabel;

  const [users, logs] = await Promise.all([
    db.user.findMany({
      where: tenantWhere(companyId, { id: { in: unique } }),
      select: { id: true, weeklyHours: true },
    }),
    db.workLog.findMany({
      where: tenantWhere(companyId, {
        userId: { in: unique },
        clockIn: { gte: start, lt: endExclusive },
      }),
      orderBy: { clockIn: "asc" },
      select: { userId: true, clockIn: true, clockOut: true, breakMins: true },
    }),
  ]);

  const logsByUser = new Map<string, Array<{ clockIn: Date; clockOut: Date | null; breakMins: number }>>();
  for (const log of logs) {
    const list = logsByUser.get(log.userId);
    const row = { clockIn: log.clockIn, clockOut: log.clockOut, breakMins: log.breakMins };
    if (list) list.push(row);
    else logsByUser.set(log.userId, [row]);
  }

  const result: Record<string, SaldoResult> = {};
  for (const user of users) {
    const userLogs = logsByUser.get(user.id) ?? [];
    result[user.id] = { ...computeWeeklySaldo({ weeklyHours: user.weeklyHours ?? 0, logs: userLogs, reference }), weekLabel };
  }

  return result;
}
