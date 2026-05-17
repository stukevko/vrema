/**
 * Vorwärts gerichtete Insights aus Personal-Vorhersage (Planung voraus).
 */
import { type Insight } from "@/lib/ai/insights";
import { buildForecastHorizon, formatWeekRangeLabel } from "@/lib/planning/forecast-horizon";
import { computeStaffingRecommendationsForWeek } from "@/lib/predictive/compute-staffing-week";
import {
  plannerBadgeLabel,
  staffingActionLine,
  staffingWhyHint,
} from "@/lib/predictive/staffing-copy";
import { db } from "@/lib/db";

const WEEKDAY_LABEL_DE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"] as const;

export async function detectForwardPlanningInsights(companyId: string): Promise<Insight[]> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { shiftCycleWeeks: true },
  });
  const cycleWeeks = company?.shiftCycleWeeks ?? 1;
  const slots = buildForecastHorizon(cycleWeeks);
  if (slots.length === 0) return [];

  const primary = slots.find((s) => s.isPrimary) ?? slots[0];
  const days = await computeStaffingRecommendationsForWeek(companyId, primary.weekStart, {
    weekIndex: primary.weekIndex,
  });

  const weekLabel = formatWeekRangeLabel(primary.weekStart);
  const results: Insight[] = [];

  for (const day of days) {
    const dow = day.dayOfWeek;
    const dayLabel = WEEKDAY_LABEL_DE[dow];
    const dateFmt = new Intl.DateTimeFormat("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      timeZone: "Europe/Berlin",
    }).format(new Date(`${day.date}T12:00:00Z`));

    if (day.holidayName) {
      results.push({
        id: `forecast:holiday:${day.date}`,
        severity: "watch",
        source: "planning",
        title: `${dayLabel}: ${day.holidayName} — Plan anpassen`,
        metric: "Feiertag",
        evidence: `Kommende Woche (${weekLabel}), ${dateFmt}.`,
        recommendation: "Im Planer prüfen: heute eher weniger Schichten oder geschlossen?",
        sampleSize: day.source === "native" ? 12 : 4,
        href: `/dashboard/planning`,
      });
      continue;
    }

    if (day.isBridge) {
      results.push({
        id: `forecast:bridge:${day.date}`,
        severity: day.tone === "urgent" ? "urgent" : "watch",
        source: "planning",
        title: `${dayLabel}: Brückentag — eher viel los`,
        metric: staffingActionLine(day.recommendation.delta, day.tone),
        evidence: `${dateFmt} · ${weekLabel}. ${staffingWhyHint(day.recommendation.drivers)}`,
        recommendation: "Lieber früh eine Schicht mehr einplanen als später unterbesetzt sein.",
        sampleSize: day.source === "native" ? 12 : 4,
        href: `/dashboard/planning`,
      });
      continue;
    }

    if (day.tone === "urgent" || day.recommendation.delta >= 2) {
      results.push({
        id: `forecast:staff:${day.date}`,
        severity: day.tone === "urgent" ? "urgent" : "watch",
        source: "planning",
        title: `${dayLabel}: ${staffingActionLine(day.recommendation.delta, day.tone)}`,
        metric: day.tone === "urgent" ? "Viel los" : "Achtung",
        evidence: `${dateFmt} · ${weekLabel}. ${staffingWhyHint(day.recommendation.drivers)}`,
        recommendation: "Im Schichtplaner für diesen Tag eine Schicht mehr eintragen.",
        sampleSize: day.source === "native" ? 12 : 4,
        href: `/dashboard/planning`,
      });
    } else if (day.recommendation.delta <= -1 && day.tone === "calm") {
      results.push({
        id: `forecast:calm:${day.date}`,
        severity: "info",
        source: "planning",
        title: `${dayLabel}: ${staffingActionLine(day.recommendation.delta, day.tone)}`,
        metric: "Ruhig",
        evidence: `${dateFmt} · ${weekLabel}. ${staffingWhyHint(day.recommendation.drivers)}`,
        recommendation: "Plan kann so bleiben — nur anpassen, wenn du mehr Umsatz erwartest.",
        sampleSize: day.source === "native" ? 12 : 4,
        href: `/dashboard/planning`,
      });
    }
  }

  return results
    .sort((a, b) => severityOrder(b.severity) - severityOrder(a.severity))
    .slice(0, 4);
}

function severityOrder(s: Insight["severity"]): number {
  return s === "urgent" ? 3 : s === "watch" ? 2 : 1;
}

/** Für Planer-Badges: Map dayOfWeek (0–6) → kompakte Empfehlung. */
export async function staffingByDayForPlannerWeek(
  companyId: string,
  weekIndex: 1 | 2 | 3,
  weekStart: string,
): Promise<
  Map<
    number,
    {
      tone: "closed" | "calm" | "watch" | "urgent";
      label: string;
      delta: number;
      tooltip: string;
    }
  >
> {
  const days = await computeStaffingRecommendationsForWeek(companyId, weekStart, { weekIndex });
  const out = new Map<
    number,
    { tone: "closed" | "calm" | "watch" | "urgent"; label: string; delta: number; tooltip: string }
  >();
  for (const d of days) {
    const label = plannerBadgeLabel(
      d.tone,
      d.recommendation.delta,
      d.holidayName,
      d.isBridge,
    );
    out.set(d.dayOfWeek, {
      tone: d.tone,
      label,
      delta: d.recommendation.delta,
      tooltip: staffingWhyHint(d.recommendation.drivers),
    });
  }
  return out;
}
