import type { AIInsightsPayload, AIReportAnalysisInput, AIReportAnalysisPayload } from "@/lib/ai/types";
import { minutesToDecimalHours } from "@/lib/time/payroll";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getMockDashboardAIInsights(): Promise<AIInsightsPayload> {
  await sleep(500);
  return {
    generatedAt: new Date().toISOString(),
    items: [
      {
        id: "insight-overtime-drop",
        level: "success",
        text: "Optimierungspotenzial: Die Überstunden in Kernbereichen sind im Vergleich zum Vormonat um 12 % gesunken.",
      },
      {
        id: "insight-break-hint",
        level: "warning",
        text: "Hinweis: Zwei Mitarbeitende haben diese Woche unvollständige Pausenangaben erfasst.",
      },
      {
        id: "insight-stability",
        level: "info",
        text: "Stabilität: Die Quote pünktlicher Einstempelungen liegt aktuell bei über 94 %.",
      },
    ],
  };
}

export async function getMockReportAnalysis(input: AIReportAnalysisInput): Promise<AIReportAnalysisPayload> {
  await sleep(1200);
  const totalHours = minutesToDecimalHours(input.totalMinutes, 2);
  const gpsRatio = input.totalEntries > 0 ? Math.round((input.gpsEntries / input.totalEntries) * 100) : 0;

  return {
    generatedAt: new Date().toISOString(),
    summary: `Für ${input.month} wurden ${totalHours} Stunden in ${input.totalEntries} Einträgen dokumentiert. Der Verlauf wirkt stabil, mit guter Datenqualität in den Kernprozessen.`,
    highlights: [
      `${gpsRatio} % der Einträge enthalten Standortdaten und sind revisionssicher dokumentiert.`,
      "Abweichungen konzentrieren sich auf wenige Einzelereignisse und sind operativ gut steuerbar.",
      "Die aktuelle Arbeitszeitstruktur ist konsistent und unterstützt eine verlässliche Monatsauswertung.",
    ],
  };
}
