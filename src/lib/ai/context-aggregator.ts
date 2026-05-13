/**
 * VREMA Neural Engine · Context Aggregator
 * ─────────────────────────────────────────
 * Bündelt alle entscheidungsrelevanten Aggregate eines Tenants zu **einem**
 * deterministischen JSON-Snapshot, der ans lokale Modell geschickt werden kann.
 *
 *  DSGVO-Hardcap:
 *   - Wir senden NUR Aggregate (Counts, Summen, Verhältnisse, Wochentags-Muster).
 *   - KEINE Klarnamen, KEINE E-Mails, KEINE IDs anderer Personen.
 *   - Tenant-ID bleibt im Server, fließt NIE in den Prompt.
 *
 *  Stabilität:
 *   - Datums-Slots immer YYYY-MM-DD in Berlin-Zeit, damit Modell-Antworten
 *     reproduzierbar bleiben.
 *   - Fehlende Daten (z. B. kein Wetter-Cache) → leere Arrays statt null,
 *     damit der Modell-Prompt schema-stabil bleibt.
 */

import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { getHolidayForDate, isBridgeDay, type GermanRegion } from "@/lib/holidays/de";
import {
  berlinDateKeyToDayOfWeek,
  getBerlinDateKey,
  listBerlinDateKeysInclusive,
} from "@/lib/time/timezone";

export type AiContextSnapshot = {
  /** Wann wurde der Snapshot erzeugt (ISO). */
  generatedAt: string;
  company: {
    industry: string | null;
    region: string | null;
    /** Anzahl aktive Mitarbeitende (kein Name, kein Detail). */
    teamSize: number;
    /** Schicht-Zyklus in Wochen (1..3). */
    shiftCycleWeeks: number;
    /** Geschätzter Wochenumsatz in EUR. */
    estimatedWeeklyRevenueEur: number | null;
  };
  /** Aggregate der letzten 28 Tage. */
  last28d: {
    workLogsTotal: number;
    avgShiftsPerWeekday: Record<number, number>; // 0=Mo … 6=So
    absencesTotal: number;
    absenceRatePct: number; // Krankenstand-Quote über 28 Tage
  };
  /** Wetter-Vorhersage (max. 7 Tage), wie wir sie aus dem Cache haben. */
  forecast: Array<{
    date: string;
    tempC: number | null;
    condition: string | null;
  }>;
  /** Feiertage und Brückentage in der kommenden Woche. */
  upcomingWeek: Array<{
    date: string;
    dayOfWeek: number;
    holidayName: string | null;
    isBridgeDay: boolean;
  }>;
  /** Aktuell für diese Woche geplante Schichten, gruppiert nach Wochentag. */
  plannedShiftsThisWeek: Record<number, number>;
};

/** Liefert YYYY-MM-DD-Schlüssel für n Tage ab heute (Berlin). */
function nextNDates(n: number): string[] {
  const today = new Date();
  return listBerlinDateKeysInclusive(today, new Date(today.getTime() + (n - 1) * 86_400_000));
}

function extractForecast(payload: unknown): AiContextSnapshot["forecast"] {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  const days = (obj.days as Array<Record<string, unknown>> | undefined) ?? [];
  return days
    .map((d) => {
      const date = typeof d.date === "string" ? d.date.slice(0, 10) : null;
      if (!date) return null;
      const tempC = typeof d.tempC === "number" ? d.tempC : typeof d.temp === "number" ? d.temp : null;
      const condition = typeof d.condition === "string" ? d.condition : null;
      return { date, tempC, condition };
    })
    .filter((d): d is AiContextSnapshot["forecast"][number] => d !== null);
}

/**
 *  Baut den vollständigen Snapshot für einen Tenant.
 *  Caller ist verantwortlich für Auth — diese Funktion akzeptiert eine
 *  bereits verifizierte companyId.
 */
export async function buildAiContext(companyId: string): Promise<AiContextSnapshot> {
  const now = new Date();
  const since28d = new Date(now.getTime() - 28 * 86_400_000);

  // Firmen-Profil
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: {
      industry: true,
      region: true,
      shiftCycleWeeks: true,
      estimatedWeeklyRevenue: true,
      _count: { select: { users: { where: { isActive: true } } } },
    },
  });

  // 28-Tage-Aggregate
  const [workLogs, absences] = await Promise.all([
    db.workLog.findMany({
      where: tenantWhere(companyId, { clockIn: { gte: since28d } }),
      select: { clockIn: true, userId: true },
    }),
    db.absence.count({
      where: { orgId: companyId, start: { gte: since28d } },
    }),
  ]);

  const avgShiftsPerWeekday: Record<number, number> = {};
  for (let dow = 0; dow < 7; dow++) avgShiftsPerWeekday[dow] = 0;
  const countByDow = new Map<number, number>();
  for (const log of workLogs) {
    const day = getBerlinDateKey(log.clockIn);
    const dow = berlinDateKeyToDayOfWeek(day);
    countByDow.set(dow, (countByDow.get(dow) ?? 0) + 1);
  }
  // 28 Tage / 7 Wochentage = 4 Vorkommen pro Wochentag.
  for (const [dow, count] of countByDow) {
    avgShiftsPerWeekday[dow] = Math.round((count / 4) * 100) / 100;
  }

  const teamSize = company?._count.users ?? 0;
  // Vorsichtig: 28-Tage-Krankenquote als (Absences ÷ Mitarbeitende × 28 Werktage-Schätzung).
  const absenceRatePct =
    teamSize > 0 ? Math.round(((absences / (teamSize * 20)) * 100) * 10) / 10 : 0;

  // Wetter
  const weather = await db.weatherCache.findUnique({
    where: { companyId },
    select: { payload: true },
  });
  const forecast = extractForecast(weather?.payload ?? null).slice(0, 7);

  // Kommende Woche – Feiertage/Brückentage
  const region = (company?.region as GermanRegion | null) ?? null;
  const upcomingDates = nextNDates(7);
  const upcomingWeek = upcomingDates.map((date) => {
    const dow = berlinDateKeyToDayOfWeek(date);
    const holiday = region ? getHolidayForDate(date, region) : null;
    return {
      date,
      dayOfWeek: dow,
      holidayName: holiday?.name ?? null,
      isBridgeDay: region ? isBridgeDay(date, region) : false,
    };
  });

  // Geplante Schichten dieser Woche, gruppiert nach Wochentag
  const plannedShiftsThisWeek: Record<number, number> = {};
  for (let dow = 0; dow < 7; dow++) plannedShiftsThisWeek[dow] = 0;
  const shifts = await db.shift.findMany({
    where: tenantWhere(companyId, { isDraft: false }),
    select: { dayOfWeek: true },
  });
  for (const s of shifts) plannedShiftsThisWeek[s.dayOfWeek] += 1;

  return {
    generatedAt: now.toISOString(),
    company: {
      industry: company?.industry ?? null,
      region: company?.region ?? null,
      teamSize,
      shiftCycleWeeks: company?.shiftCycleWeeks ?? 1,
      estimatedWeeklyRevenueEur: company?.estimatedWeeklyRevenue ?? null,
    },
    last28d: {
      workLogsTotal: workLogs.length,
      avgShiftsPerWeekday,
      absencesTotal: absences,
      absenceRatePct,
    },
    forecast,
    upcomingWeek,
    plannedShiftsThisWeek,
  };
}
