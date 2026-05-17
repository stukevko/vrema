"use server";

import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";

export type PlannerQuickSuggestRow = {
  userId: string;
  displayName: string;
  startTime: string;
  endTime: string;
  hint: string;
};

function quickSuggestHint(historyCount: number): string {
  if (historyCount >= 3) return "Öfter geplant";
  if (historyCount >= 1) return "Schon mal da";
  return "Standard-Zeiten";
}

function modeTimePair(rows: { startTime: string; endTime: string }[]): { startTime: string; endTime: string } {
  if (rows.length === 0) return { startTime: "09:00", endTime: "17:00" };
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = `${r.startTime}|${r.endTime}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let bestK = "09:00|17:00";
  let bestN = 0;
  for (const [k, n] of counts) {
    if (n > bestN) {
      bestN = n;
      bestK = k;
    }
  }
  const [startTime, endTime] = bestK.split("|");
  return { startTime, endTime };
}

/**
 * Native-AI-Assist (heuristisch): schlägt 1–2 Mitarbeitende vor, die an diesem
 * Wochentag historisch oft eingeplant waren und aktuell noch frei sind.
 */
export async function getPlannerQuickSuggest(input: {
  weekIndex: number;
  dayOfWeek: number;
}): Promise<PlannerQuickSuggestRow[]> {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const weekIndex = Math.min(3, Math.max(1, Math.floor(input.weekIndex)));
  const dayOfWeek = Math.min(6, Math.max(0, Math.floor(input.dayOfWeek)));
  const since = new Date(Date.now() - 180 * 86400000);

  const [users, occupied, history] = await Promise.all([
    db.user.findMany({
      where: tenantWhere(companyId, {
        isActive: true,
        role: { in: [UserRole.EMPLOYEE, UserRole.MANAGER] },
      }),
      select: { id: true, name: true, email: true },
    }),
    db.shift.findMany({
      where: tenantWhere(companyId, { weekIndex, dayOfWeek, isDraft: false }),
      select: { userId: true },
    }),
    db.shift.findMany({
      where: tenantWhere(companyId, {
        dayOfWeek,
        isDraft: false,
        updatedAt: { gte: since },
      }),
      select: { userId: true, startTime: true, endTime: true },
      take: 1200,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const busy = new Set(occupied.map((s) => s.userId));

  const histByUser = new Map<string, { startTime: string; endTime: string }[]>();
  const histAll: { startTime: string; endTime: string }[] = [];
  for (const h of history) {
    histAll.push({ startTime: h.startTime, endTime: h.endTime });
    const arr = histByUser.get(h.userId) ?? [];
    arr.push({ startTime: h.startTime, endTime: h.endTime });
    histByUser.set(h.userId, arr);
  }

  const companyPair = modeTimePair(histAll);

  return users
    .filter((u) => !busy.has(u.id))
    .map((u) => {
      const personal = histByUser.get(u.id) ?? [];
      const pair = personal.length > 0 ? modeTimePair(personal) : companyPair;
      return {
        userId: u.id,
        displayName: (u.name?.trim() || u.email).trim(),
        startTime: pair.startTime,
        endTime: pair.endTime,
        score: personal.length,
      };
    })
    .sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName, "de"))
    .slice(0, 2)
    .map(({ score, ...row }) => ({ ...row, hint: quickSuggestHint(score) }));
}
