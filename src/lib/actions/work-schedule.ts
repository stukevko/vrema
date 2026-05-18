"use server";

import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import { revalidatePath } from "next/cache";

export type WorkScheduleRow = {
  dayOfWeek: number;
  isWorkDay: boolean;
  startTime: string;
  endTime: string;
  breakMins: number;
};

const DEFAULT_ROW = (dayOfWeek: number): WorkScheduleRow => ({
  dayOfWeek,
  isWorkDay: dayOfWeek >= 1 && dayOfWeek <= 5,
  startTime: "09:00",
  endTime: "17:00",
  breakMins: 30,
});

/** 0=So … 6=Sa — Verfügbarkeit / typische Arbeitszeiten. */
export async function getMyWorkSchedule(): Promise<WorkScheduleRow[]> {
  const { companyId, userId } = await requireTenant();

  const rows = await db.workSchedule.findMany({
    where: tenantWhere(companyId, { userId }),
    orderBy: { dayOfWeek: "asc" },
  });

  const byDay = new Map(rows.map((r) => [r.dayOfWeek, r]));
  return Array.from({ length: 7 }, (_, dayOfWeek) => {
    const hit = byDay.get(dayOfWeek);
    if (!hit) return DEFAULT_ROW(dayOfWeek);
    return {
      dayOfWeek,
      isWorkDay: hit.isWorkDay,
      startTime: hit.startTime,
      endTime: hit.endTime,
      breakMins: hit.breakMins,
    };
  });
}

export async function saveMyWorkSchedule(rows: WorkScheduleRow[]): Promise<{ ok: true }> {
  const { companyId, userId } = await requireTenant();

  for (const row of rows) {
    if (row.dayOfWeek < 0 || row.dayOfWeek > 6) continue;
    await db.workSchedule.upsert({
      where: {
        companyId_userId_dayOfWeek: {
          companyId,
          userId,
          dayOfWeek: row.dayOfWeek,
        },
      },
      create: {
        companyId,
        userId,
        dayOfWeek: row.dayOfWeek,
        isWorkDay: row.isWorkDay,
        startTime: row.startTime,
        endTime: row.endTime,
        breakMins: Math.max(0, Math.min(180, Math.round(row.breakMins))),
      },
      update: {
        isWorkDay: row.isWorkDay,
        startTime: row.startTime,
        endTime: row.endTime,
        breakMins: Math.max(0, Math.min(180, Math.round(row.breakMins))),
      },
    });
  }

  revalidatePath("/dashboard/account");
  revalidatePath("/dashboard/planning");
  return { ok: true };
}

/** Für Planer: userId → Tage, an denen keine Arbeit möglich ist. */
export async function getUnavailableDaysByUserIds(
  userIds: string[],
): Promise<Map<string, Set<number>>> {
  const { companyId } = await requireTenant();
  if (userIds.length === 0) return new Map();

  const rows = await db.workSchedule.findMany({
    where: tenantWhere(companyId, {
      userId: { in: userIds },
      isWorkDay: false,
    }),
    select: { userId: true, dayOfWeek: true },
  });

  const map = new Map<string, Set<number>>();
  for (const r of rows) {
    const set = map.get(r.userId) ?? new Set<number>();
    set.add(r.dayOfWeek);
    map.set(r.userId, set);
  }
  return map;
}
