/**
 * Stoß-Profil pro Wochentag (Pilot): ruhig / normal / Stoß.
 * Index 0 = Montag … 6 = Sonntag (wie Planer Mo–So).
 */
export type PeakDayLevel = "LOW" | "NORMAL" | "HIGH";

export const PEAK_DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

export const PEAK_LEVEL_OPTIONS: { value: PeakDayLevel; label: string; hint: string }[] = [
  { value: "LOW", label: "Ruhig", hint: "Weniger Andrang als üblich" },
  { value: "NORMAL", label: "Normal", hint: "Typischer Tag" },
  { value: "HIGH", label: "Stoß", hint: "Stoßzeit / hoher Umsatz erwartet" },
];

export const DEFAULT_PEAK_DAY_LEVELS: PeakDayLevel[] = [
  "NORMAL",
  "NORMAL",
  "NORMAL",
  "NORMAL",
  "NORMAL",
  "NORMAL",
  "NORMAL",
];

const VALID = new Set<string>(["LOW", "NORMAL", "HIGH"]);

export function normalizePeakDayLevels(raw: string[] | null | undefined): PeakDayLevel[] {
  const out: PeakDayLevel[] = [];
  for (let i = 0; i < 7; i += 1) {
    const v = raw?.[i];
    out.push(v && VALID.has(v) ? (v as PeakDayLevel) : "NORMAL");
  }
  return out;
}

/** JS getDay(): 0=So … 6=Sa → Peak-Array-Index (Mo=0). */
export function peakLevelForJsDayOfWeek(jsDow: number, levels: PeakDayLevel[]): PeakDayLevel {
  const idx = jsDow === 0 ? 6 : jsDow - 1;
  return levels[idx] ?? "NORMAL";
}

export function peakImpactOnStaffing(level: PeakDayLevel): { utilization: number; deltaBoost: number; label: string } {
  switch (level) {
    case "LOW":
      return { utilization: -0.1, deltaBoost: -1, label: "Ruhiger Tag (Peak-Profil)" };
    case "HIGH":
      return { utilization: 0.18, deltaBoost: 1, label: "Stoß erwartet (Peak-Profil)" };
    default:
      return { utilization: 0, deltaBoost: 0, label: "" };
  }
}
