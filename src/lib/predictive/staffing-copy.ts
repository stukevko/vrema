/**
 * Klartext für Personal-Empfehlungen — ohne Score-Prozente in der UI.
 */
import type { StaffingRecommendation } from "@/lib/predictive/staffing";

export function staffingActionLine(
  delta: number,
  tone: "closed" | "calm" | "watch" | "urgent",
): string {
  if (tone === "closed") return "Eher geschlossen planen";
  if (delta >= 2) return `Lieber ${delta} Schichten mehr`;
  if (delta === 1) return "Eine Schicht mehr einplanen";
  if (delta === 0) return "Plan passt so";
  if (delta === -1) return "Eher ruhig – Plan reicht";
  return `${Math.abs(delta)} Schichten können weg`;
}

export function staffingTrustLabel(confidence: number, source: "native" | "heuristic"): string {
  if (source === "native") {
    if (confidence >= 0.65) return "Basiert auf deinen bisherigen Plänen";
    return "Erste Muster aus deinen Plänen";
  }
  if (confidence >= 0.55) return "Schätzung aus Branche & Kalender";
  return "Erste Schätzung – wird genauer";
}

export function staffingWhyHint(drivers: StaffingRecommendation["drivers"]): string {
  const pick = drivers
    .map((d) => d.label)
    .filter((l) => !/Aktuell geplant|Historie \(Median/i.test(l))
    .slice(0, 3);
  if (pick.length === 0) return "Aus Wochentag, Wetter und Feiertagen";
  return pick.join(" · ");
}

export function plannerBadgeLabel(
  tone: "closed" | "calm" | "watch" | "urgent",
  delta: number,
  holidayName?: string | null,
  isBridge?: boolean,
  peakLevel?: "LOW" | "NORMAL" | "HIGH",
): string {
  if (holidayName) return "Feiertag";
  if (isBridge) return "Brückentag";
  if (tone === "closed") return "Zu";
  if (peakLevel === "HIGH" && delta >= 1) return "Stoß · +1 prüfen";
  if (peakLevel === "HIGH") return "Stoß erwartet";
  if (delta >= 2) return "Mehr Personal";
  if (delta === 1) return "+1 Schicht";
  if (delta <= -1) return "Ruhig";
  if (tone === "urgent") return "Voll";
  if (tone === "watch") return "Achtung";
  return "";
}
