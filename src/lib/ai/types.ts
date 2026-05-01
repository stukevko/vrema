export type AIInsightLevel = "info" | "warning" | "success";

export interface AIInsightItem {
  id: string;
  level: AIInsightLevel;
  text: string;
}

export interface AIInsightsPayload {
  generatedAt: string;
  items: AIInsightItem[];
}

export interface AIReportAnalysisPayload {
  generatedAt: string;
  summary: string;
  highlights: string[];
}

export interface AIReportAnalysisInput {
  month: string;
  totalMinutes: number;
  totalEntries: number;
  gpsEntries: number;
}
