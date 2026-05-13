/**
 *  VREMA Native Core AI – Insights / Pattern-Detection.
 *
 *  Liest direkt auf WorkLog, Shift und Absence zu und destilliert harte,
 *  zahlenbelegte Erkenntnisse. Kein LLM, keine Texte aus Modellen –
 *  ausschließlich aus Tenant-Daten errechnete Aussagen.
 *
 *  Jede Insight enthält:
 *    - title:           Eine kurze, in der UI darstellbare Aussage
 *    - metric:          Die konkrete Zahl ("12,3 %", "1,8×", …)
 *    - evidence:        Den Beleg (Stichprobe, Vergleichszeitraum)
 *    - recommendation:  Was der Owner konkret tun kann
 *    - sampleSize:      Anzahl Datenpunkte (für UX-Konfidenz)
 *
 *  Wenn die Datenbasis zu klein ist, wird die jeweilige Insight schlicht weggelassen.
 */

import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { getBerlinDateKey, berlinDateKeyToDayOfWeek } from "@/lib/time/timezone";

const WEEKDAY_LABEL_DE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"] as const;

export type InsightSeverity = "info" | "watch" | "urgent";
export type InsightSource =
  | "lateness"
  | "overstaffing"
  | "understaffing"
  | "sick_cluster"
  | "fluctuation"
  | "trend";

export type Insight = {
  id: string;
  severity: InsightSeverity;
  source: InsightSource;
  title: string;
  metric: string;
  evidence: string;
  recommendation: string;
  sampleSize: number;
  /** Optionaler Deep-Link ins Dashboard. */
  href?: string;
};

const MIN_SAMPLE_FOR_INSIGHT = 6;

/**
 *  Public Entry-Point: liefert eine sortierte Liste konkreter Insights.
 *  Caller verifiziert vorher Tenant & Rolle.
 */
export async function detectInsights(companyId: string): Promise<Insight[]> {
  const [lateness, overstaffing, sickClusters, fluctuation] = await Promise.all([
    detectLatenessByWeekday(companyId),
    detectOverstaffingTrend(companyId),
    detectSickClusters(companyId),
    detectFluctuation(companyId),
  ]);

  return [...overstaffing, ...sickClusters, ...lateness, ...fluctuation]
    .sort((a, b) => severityOrder(b.severity) - severityOrder(a.severity))
    .slice(0, 6);
}

// ──────────────────────────────────────────────────────────────────────────
//  Detektor 1: Verspätungs-Quote pro Wochentag (letzte 8 Wochen)
// ──────────────────────────────────────────────────────────────────────────

async function detectLatenessByWeekday(companyId: string): Promise<Insight[]> {
  const since = new Date();
  since.setDate(since.getDate() - 56);

  const logs = await db.workLog.findMany({
    where: tenantWhere(companyId, { clockIn: { gte: since } }),
    select: { clockIn: true, status: true },
  });

  if (logs.length < MIN_SAMPLE_FOR_INSIGHT * 4) return [];

  // pro Wochentag: total / late
  const buckets = new Map<number, { total: number; late: number }>();
  for (const l of logs) {
    const dow = berlinDateKeyToDayOfWeek(getBerlinDateKey(l.clockIn));
    const b = buckets.get(dow) ?? { total: 0, late: 0 };
    b.total += 1;
    if (l.status === "LATE") b.late += 1;
    buckets.set(dow, b);
  }

  // Gesamt-Verspätungsquote als Referenz
  let totalAll = 0;
  let totalLate = 0;
  for (const b of buckets.values()) {
    totalAll += b.total;
    totalLate += b.late;
  }
  if (totalAll === 0) return [];
  const baseRate = totalLate / totalAll;

  // Wochentag mit signifikant höherer Quote suchen
  const results: Insight[] = [];
  let worstDow = -1;
  let worstDeviation = 0;
  for (const [dow, b] of buckets) {
    if (b.total < MIN_SAMPLE_FOR_INSIGHT) continue;
    const rate = b.late / b.total;
    const dev = rate - baseRate;
    if (dev > worstDeviation && dev > 0.05) {
      worstDeviation = dev;
      worstDow = dow;
    }
  }
  if (worstDow >= 0) {
    const b = buckets.get(worstDow)!;
    const rate = b.late / b.total;
    const devPct = (rate - baseRate) * 100;
    results.push({
      id: `lateness:${worstDow}`,
      severity: devPct > 12 ? "urgent" : "watch",
      source: "lateness",
      title: `${WEEKDAY_LABEL_DE[worstDow]}s ist die Verspätungsquote auffällig hoch`,
      metric: `+${devPct.toFixed(1)} %-Punkte`,
      evidence: `${WEEKDAY_LABEL_DE[worstDow]}: ${b.late} von ${b.total} Stempelungen verspätet (${(
        rate * 100
      ).toFixed(1)} %). Restwoche-Schnitt: ${(baseRate * 100).toFixed(1)} %.`,
      recommendation:
        "Sprich das Team auf diesen Wochentag konkret an oder verschiebe den Schichtbeginn um 15 min.",
      sampleSize: b.total,
      href: "/dashboard/reports",
    });
  }
  return results;
}

// ──────────────────────────────────────────────────────────────────────────
//  Detektor 2: Über-/Unterbesetzung – letzter Monat vs. Vormonat
// ──────────────────────────────────────────────────────────────────────────

async function detectOverstaffingTrend(companyId: string): Promise<Insight[]> {
  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - 30);
  const prevStart = new Date(now);
  prevStart.setDate(prevStart.getDate() - 60);
  const prevEnd = new Date(currentStart);

  const [logsCurrent, logsPrev] = await Promise.all([
    db.workLog.findMany({
      where: tenantWhere(companyId, { clockIn: { gte: currentStart, lte: now } }),
      select: { clockIn: true },
    }),
    db.workLog.findMany({
      where: tenantWhere(companyId, { clockIn: { gte: prevStart, lt: prevEnd } }),
      select: { clockIn: true },
    }),
  ]);
  if (logsCurrent.length === 0 || logsPrev.length === 0) return [];

  // pro Wochentag (vergleichbar)
  const curByDow = new Array(7).fill(0);
  const prevByDow = new Array(7).fill(0);
  for (const l of logsCurrent) {
    const d = berlinDateKeyToDayOfWeek(getBerlinDateKey(l.clockIn));
    curByDow[d] += 1;
  }
  for (const l of logsPrev) {
    const d = berlinDateKeyToDayOfWeek(getBerlinDateKey(l.clockIn));
    prevByDow[d] += 1;
  }

  const results: Insight[] = [];
  for (let d = 0; d < 7; d++) {
    if (prevByDow[d] < MIN_SAMPLE_FOR_INSIGHT) continue;
    const change = (curByDow[d] - prevByDow[d]) / prevByDow[d];
    if (Math.abs(change) < 0.1) continue; // < 10 % ist Rauschen

    const isOver = change > 0;
    results.push({
      id: `${isOver ? "over" : "under"}-staffing:${d}`,
      severity: Math.abs(change) > 0.2 ? "urgent" : "watch",
      source: isOver ? "overstaffing" : "understaffing",
      title: isOver
        ? `${WEEKDAY_LABEL_DE[d]}s mehr Personalstunden als im Vormonat`
        : `${WEEKDAY_LABEL_DE[d]}s weniger Personalstunden als im Vormonat`,
      metric: `${change >= 0 ? "+" : ""}${(change * 100).toFixed(1)} %`,
      evidence: `Letzte 30 Tage: ${curByDow[d]} Stempelungen am ${WEEKDAY_LABEL_DE[d]}. Vormonat: ${prevByDow[d]}.`,
      recommendation: isOver
        ? "Prüfe, ob 1 Schicht reduziert werden kann – ohne Umsatzrisiko."
        : "Stelle sicher, dass genügend Kapazität geplant ist – Wartezeiten checken.",
      sampleSize: prevByDow[d] + curByDow[d],
      href: "/dashboard/planning",
    });
  }
  // höchste absolute Abweichung zuerst
  return results.sort((a, b) => parseAbsMetric(b.metric) - parseAbsMetric(a.metric)).slice(0, 2);
}

// ──────────────────────────────────────────────────────────────────────────
//  Detektor 3: Krankheits-Cluster (Wochentag/Wochenende)
// ──────────────────────────────────────────────────────────────────────────

async function detectSickClusters(companyId: string): Promise<Insight[]> {
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const absences = await db.absence.findMany({
    where: {
      orgId: companyId,
      type: "SICK",
      status: "APPROVED",
      start: { gte: since },
    },
    select: { start: true },
  });
  if (absences.length < MIN_SAMPLE_FOR_INSIGHT) return [];

  const weekdayCount = new Array(7).fill(0);
  for (const a of absences) {
    const dow = berlinDateKeyToDayOfWeek(getBerlinDateKey(a.start));
    weekdayCount[dow] += 1;
  }
  const avg = absences.length / 7;
  const max = Math.max(...weekdayCount);
  if (max < avg * 1.5 || max < MIN_SAMPLE_FOR_INSIGHT / 2) return [];

  const dow = weekdayCount.indexOf(max);
  const ratio = max / Math.max(1, avg);
  return [
    {
      id: `sick:${dow}`,
      severity: ratio > 2 ? "urgent" : "watch",
      source: "sick_cluster",
      title: `${WEEKDAY_LABEL_DE[dow]}s mehr Krankmeldungen als an anderen Tagen`,
      metric: `${ratio.toFixed(1)}× Schnitt`,
      evidence: `Letzte 90 Tage: ${max} Krankmeldungen am ${WEEKDAY_LABEL_DE[dow]}, Schnitt aller Tage: ${avg.toFixed(
        1,
      )}.`,
      recommendation: "Zeitige Krankschreibung erleichtern und Backup-Kräfte für diesen Tag bereithalten.",
      sampleSize: absences.length,
      href: "/dashboard/team",
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────────
//  Detektor 4: Fluktuation – Geplante vs. gestempelte Stunden
// ──────────────────────────────────────────────────────────────────────────

async function detectFluctuation(companyId: string): Promise<Insight[]> {
  const since = new Date();
  since.setDate(since.getDate() - 28);

  // gestempelte Minuten: clockOut - clockIn - breakMins (nur abgeschlossene Logs)
  const logs = await db.workLog.findMany({
    where: tenantWhere(companyId, {
      clockIn: { gte: since },
      clockOut: { not: null },
    }),
    select: { clockIn: true, clockOut: true, breakMins: true },
  });
  if (logs.length < MIN_SAMPLE_FOR_INSIGHT * 4) return [];

  const totalActualMin = logs.reduce((acc, l) => {
    if (!l.clockOut) return acc;
    const m = (l.clockOut.getTime() - l.clockIn.getTime()) / 60000 - (l.breakMins ?? 0);
    return acc + Math.max(0, m);
  }, 0);

  // geplante Minuten: Summe (endTime - startTime - breakDuration) aller publizierten Shifts × 4 Wochen
  const shifts = await db.shift.findMany({
    where: tenantWhere(companyId, { isDraft: false }),
    select: { startTime: true, endTime: true, breakDuration: true },
  });
  if (shifts.length === 0) return [];
  const shiftMinPerWeek = shifts.reduce((acc, s) => {
    const [sh, sm] = s.startTime.split(":").map(Number);
    const [eh, em] = s.endTime.split(":").map(Number);
    let mins = eh * 60 + em - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60; // Nachtschicht über Mitternacht
    return acc + Math.max(0, mins - (s.breakDuration ?? 0));
  }, 0);
  const totalPlannedMin = shiftMinPerWeek * 4;
  if (totalPlannedMin === 0) return [];

  const diff = (totalActualMin - totalPlannedMin) / totalPlannedMin;
  if (Math.abs(diff) < 0.05) return [];

  const isOver = diff > 0;
  return [
    {
      id: "fluctuation",
      severity: Math.abs(diff) > 0.15 ? "urgent" : "watch",
      source: "fluctuation",
      title: isOver
        ? "Tatsächliche Arbeitszeit übersteigt den Plan"
        : "Tatsächliche Arbeitszeit liegt unter dem Plan",
      metric: `${diff >= 0 ? "+" : ""}${(diff * 100).toFixed(1)} %`,
      evidence: `Letzte 4 Wochen: ${formatHours(totalActualMin)} gestempelt vs. ${formatHours(
        totalPlannedMin,
      )} geplant.`,
      recommendation: isOver
        ? "Überstunden prüfen – evtl. Schichten zu eng kalkuliert."
        : "Sind Stempelungen vollständig? Vergleiche Plan und Realität pro Mitarbeiter.",
      sampleSize: logs.length,
      href: "/dashboard/reports",
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────────────────

function severityOrder(s: InsightSeverity): number {
  return s === "urgent" ? 3 : s === "watch" ? 2 : 1;
}

function parseAbsMetric(metric: string): number {
  const n = Number(metric.replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

function formatHours(min: number): string {
  const h = min / 60;
  return `${h.toLocaleString("de-DE", { maximumFractionDigits: 1 })} h`;
}
