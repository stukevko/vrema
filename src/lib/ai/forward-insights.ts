/**
 * Vorwärts gerichtete Insights aus Personal-Vorhersage (Planung voraus).
 */
import { type Insight } from "@/lib/ai/insights";
import { buildForecastHorizon, formatWeekRangeLabel } from "@/lib/planning/forecast-horizon";
import { computeStaffingRecommendationsForWeek } from "@/lib/predictive/compute-staffing-week";
import { db } from "@/lib/db";

const WEEKDAY_LABEL_DE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"] as const;

const TONE_LABEL: Record<string, string> = {
  urgent: "Aufstocken",
  watch: "Aufmerksam",
  calm: "Entspannt",
  closed: "Geschlossen",
};

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
        title: `${dayLabel}: ${day.holidayName} — Planung prüfen`,
        metric: "Feiertag",
        evidence: `Kommende Woche (${weekLabel}), ${dateFmt}. Feiertage beeinflussen Auslastung und Öffnungszeiten.`,
        recommendation: "Prüfe im Planer, ob Schichten reduziert oder geschlossen werden sollen.",
        sampleSize: Math.round(day.recommendation.confidence * 100),
        href: `/dashboard/planning`,
      });
      continue;
    }

    if (day.isBridge) {
      results.push({
        id: `forecast:bridge:${day.date}`,
        severity: day.tone === "urgent" ? "urgent" : "watch",
        source: "planning",
        title: `${dayLabel} ist Brückentag — höhere Nachfrage möglich`,
        metric: day.recommendation.delta > 0 ? `+${day.recommendation.delta} Pers.` : TONE_LABEL[day.tone] ?? "Brückentag",
        evidence: `${dateFmt} in ${weekLabel}. Brückentage wirken im Gastgewerbe oft wie ein verlängertes Wochenende.`,
        recommendation: "Plane Abend- oder Wochenend-Personal frühzeitig ein.",
        sampleSize: Math.round(day.recommendation.confidence * 100),
        href: `/dashboard/planning`,
      });
      continue;
    }

    if (day.tone === "urgent" || day.recommendation.delta >= 2) {
      results.push({
        id: `forecast:staff:${day.date}`,
        severity: day.tone === "urgent" ? "urgent" : "watch",
        source: "planning",
        title: `${dayLabel}: mehr Personal empfohlen`,
        metric:
          day.recommendation.delta > 0
            ? `+${day.recommendation.delta} Person${Math.abs(day.recommendation.delta) === 1 ? "" : "en"}`
            : TONE_LABEL[day.tone] ?? "Aufstocken",
        evidence: `${dateFmt} · ${weekLabel}. ${day.recommendation.drivers
          .slice(0, 2)
          .map((d) => d.label)
          .join(" · ")}`,
        recommendation: "Im Schichtplaner Kapazität für diesen Tag erhöhen, bevor die Woche startet.",
        sampleSize: Math.round(day.recommendation.confidence * 100),
        href: `/dashboard/planning`,
      });
    } else if (day.recommendation.delta <= -1 && day.tone === "calm") {
      results.push({
        id: `forecast:calm:${day.date}`,
        severity: "info",
        source: "planning",
        title: `${dayLabel}: eher entspannt geplant`,
        metric: `${day.recommendation.delta} Personen`,
        evidence: `${dateFmt} in ${weekLabel} — nach Wetter, Branche und bisherigen Plänen.`,
        recommendation: "Optional Schichten straffen, wenn der Umsatz es hergibt.",
        sampleSize: Math.round(day.recommendation.confidence * 100),
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
    const label =
      d.holidayName != null
        ? "Feiertag"
        : d.isBridge
          ? "Brückentag"
          : d.tone === "urgent"
            ? d.recommendation.delta > 0
              ? `+${d.recommendation.delta}`
              : "Aufstocken"
            : d.tone === "watch"
              ? "Achtung"
              : d.tone === "closed"
                ? "Zu"
                : d.recommendation.delta < 0
                  ? `${d.recommendation.delta}`
                  : "OK";
    out.set(d.dayOfWeek, {
      tone: d.tone,
      label,
      delta: d.recommendation.delta,
      tooltip: d.recommendation.drivers.map((x) => x.label).join(" · "),
    });
  }
  return out;
}
