/**
 * VREMA · ArbZG-Compliance-Engine
 * ────────────────────────────────
 * Prüft Schichten gegen das deutsche Arbeitszeitgesetz (ArbZG).
 *
 * Reine Library (keine DB, keine I/O) – dadurch sowohl serverseitig
 * (Reports, PDF, API) als auch clientseitig (ShiftManager-UI-Pille)
 * verwendbar. Tests bleiben trivial.
 *
 * Implementierte Regeln (kann pro Firma überschrieben werden):
 *   §3  Werktägliche Arbeitszeit  → max. 10h (Standard 8h, erweiterbar)
 *   §3  Wöchentliche Arbeitszeit  → max. 48h
 *   §4  Ruhepausen
 *           6h–9h Schicht → ≥ 30 Min Pause
 *           > 9h Schicht  → ≥ 45 Min Pause
 *   §5  Ruhezeit zwischen Schichten → ≥ 11h
 *
 * Designentscheidung: Wir geben keine Boolean-Flag „compliant ja/nein"
 * zurück, sondern eine **Liste konkreter Findings** mit `severity`, `ruleId`,
 * `humanMessage` und `data`. So kann die UI feine Farbcodes setzen
 * (warn = ambergelb, violation = muted-red) und der Owner in Reports
 * pro Mitarbeiter:in sehen, **welche** Regel **wie oft** gerissen wurde.
 */

export type ArbZgRuleId =
  | "max_daily_hours"
  | "max_weekly_hours"
  | "min_break"
  | "min_rest_between_shifts";

export type ArbZgSeverity = "warn" | "violation";

export type ArbZgFinding = {
  ruleId: ArbZgRuleId;
  severity: ArbZgSeverity;
  /** Schicht-ID(s), auf die sich das Finding bezieht. */
  shiftIds: string[];
  /** Sprechende deutsche UI-Nachricht (Tooltip-fähig). */
  message: string;
  /** Maschinenlesbare Zusatzdaten (z. B. tatsächliche vs. erlaubte Minuten). */
  data: Record<string, number | string>;
};

export type ArbZgConfig = {
  /** Maximale Arbeitsstunden pro Werktag (Default 10h, ArbZG §3). */
  maxDailyHours: number;
  /** Maximale Arbeitsstunden pro Woche (Default 48h, ArbZG §3 Durchschnitt). */
  maxWeeklyHours: number;
  /** Minimale Ruhezeit zwischen zwei Schichten in Stunden (Default 11h, §5). */
  minRestBetweenShiftsHours: number;
  /** Pause ab 6h Schicht, ArbZG §4 (Standard 30 Min). */
  breakRequiredAfterHours: number;
  breakRequiredMinutes: number;
  /** Pause ab 9h Schicht, ArbZG §4 (Standard 45 Min). */
  longBreakRequiredAfterHours: number;
  longBreakRequiredMinutes: number;
};

export const DEFAULT_ARBZG_CONFIG: ArbZgConfig = {
  maxDailyHours: 10,
  maxWeeklyHours: 48,
  minRestBetweenShiftsHours: 11,
  breakRequiredAfterHours: 6,
  breakRequiredMinutes: 30,
  longBreakRequiredAfterHours: 9,
  longBreakRequiredMinutes: 45,
};

/** Schicht-Datenmodell, das die Engine versteht (DB-agnostisch). */
export type ShiftLike = {
  id: string;
  userId: string;
  /** ISO-Date "YYYY-MM-DD" oder Date — wir normalisieren intern. */
  date: string | Date;
  /** "HH:MM". */
  startTime: string;
  /** "HH:MM" – wenn vor `startTime`, gilt sie als am Folgetag (Nachtschicht). */
  endTime: string;
  /** Pausen in Minuten (gesamt). */
  breakMinutes: number;
};

const HHMM_REGEX = /^(\d{1,2}):(\d{2})$/;

function parseHhmmToMinutes(hhmm: string): number | null {
  const m = HHMM_REGEX.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 47 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** Wandelt eine Schicht in „Arbeitsdauer in Minuten ohne Pausen". */
function netWorkMinutes(s: ShiftLike): number {
  const start = parseHhmmToMinutes(s.startTime);
  const end = parseHhmmToMinutes(s.endTime);
  if (start === null || end === null) return 0;
  const gross = end > start ? end - start : 24 * 60 - start + end; // Nachtschicht
  return Math.max(0, gross - Math.max(0, s.breakMinutes));
}

/** ISO-Tag-Key in Berlin (YYYY-MM-DD), robust gegenüber Date|string. */
function dayKey(date: string | Date): string {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 10);
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Wandelt eine Schicht in [startMs, endMs] in UTC, basierend auf Berlin-Wand-Uhr. */
function shiftBoundsUtc(s: ShiftLike): { startMs: number; endMs: number } {
  const day = dayKey(s.date);
  const [y, m, d] = day.split("-").map(Number);
  const start = parseHhmmToMinutes(s.startTime) ?? 0;
  const end = parseHhmmToMinutes(s.endTime) ?? 0;
  const startUtc = Date.UTC(y, m - 1, d, Math.floor(start / 60), start % 60);
  const endRaw = Date.UTC(y, m - 1, d, Math.floor(end / 60), end % 60);
  const endUtc = end > start ? endRaw : endRaw + 24 * 60 * 60 * 1000;
  // Berlin-Offset: vereinfachte Korrektur. Für reines Sortieren / Differenzen
  // reicht der Wand-Uhr-basierte UTC-Wert, weil wir alle Schichten in dieselbe
  // Konvention zwingen. Für ArbZG-Ruhezeit-Differenz spielt der absolute
  // Offset keine Rolle (gleiche Konstante auf beiden Seiten).
  return { startMs: startUtc, endMs: endUtc };
}

/** ISO-Wochen-Key (YYYY-Www) für Wochensummen. */
function isoWeekKey(date: string | Date): string {
  const day = dayKey(date);
  const [y, m, d] = day.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1, d));
  const dayNr = (target.getUTCDay() + 6) % 7; // Mo=0
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = (target.getTime() - firstThursday.getTime()) / 86_400_000;
  const week = 1 + Math.floor(diff / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Hauptevaluator. Liefert eine flache Findings-Liste über alle gegebenen
 * Schichten eines Users (oder mehrere, gruppiert intern).
 */
export function evaluateShifts(
  shifts: ShiftLike[],
  config: ArbZgConfig = DEFAULT_ARBZG_CONFIG,
): ArbZgFinding[] {
  if (shifts.length === 0) return [];
  const findings: ArbZgFinding[] = [];

  // Pro-User-Buckets
  const byUser = new Map<string, ShiftLike[]>();
  for (const s of shifts) {
    const arr = byUser.get(s.userId) ?? [];
    arr.push(s);
    byUser.set(s.userId, arr);
  }

  for (const [, userShifts] of byUser) {
    const sorted = [...userShifts].sort((a, b) => shiftBoundsUtc(a).startMs - shiftBoundsUtc(b).startMs);

    // §3 max daily + §4 Pausen
    const byDay = new Map<string, ShiftLike[]>();
    for (const s of sorted) {
      const k = dayKey(s.date);
      const arr = byDay.get(k) ?? [];
      arr.push(s);
      byDay.set(k, arr);
    }
    for (const [day, daily] of byDay) {
      const totalMinutes = daily.reduce((sum, s) => sum + netWorkMinutes(s), 0);
      const totalHours = totalMinutes / 60;
      if (totalHours > config.maxDailyHours) {
        findings.push({
          ruleId: "max_daily_hours",
          severity: "violation",
          shiftIds: daily.map((s) => s.id),
          message: `Tägliche Höchstarbeitszeit überschritten: ${totalHours.toFixed(1)}h (max. ${config.maxDailyHours}h, ArbZG §3).`,
          data: { day, actualHours: Math.round(totalHours * 100) / 100, allowedHours: config.maxDailyHours },
        });
      }

      // §4 Pausen: nur sinnvoll für einzelne Schichten
      for (const s of daily) {
        const workHours = netWorkMinutes(s) / 60;
        if (
          workHours > config.longBreakRequiredAfterHours &&
          s.breakMinutes < config.longBreakRequiredMinutes
        ) {
          findings.push({
            ruleId: "min_break",
            severity: "violation",
            shiftIds: [s.id],
            message: `Pause zu kurz: ${s.breakMinutes} Min bei ${workHours.toFixed(1)}h (≥ ${config.longBreakRequiredMinutes} Min, ArbZG §4).`,
            data: { actualBreakMinutes: s.breakMinutes, requiredBreakMinutes: config.longBreakRequiredMinutes },
          });
        } else if (
          workHours > config.breakRequiredAfterHours &&
          s.breakMinutes < config.breakRequiredMinutes
        ) {
          findings.push({
            ruleId: "min_break",
            severity: "warn",
            shiftIds: [s.id],
            message: `Pause zu kurz: ${s.breakMinutes} Min bei ${workHours.toFixed(1)}h (≥ ${config.breakRequiredMinutes} Min, ArbZG §4).`,
            data: { actualBreakMinutes: s.breakMinutes, requiredBreakMinutes: config.breakRequiredMinutes },
          });
        }
      }
    }

    // §5 Ruhezeit zwischen aufeinanderfolgenden Schichten
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const prevEnd = shiftBoundsUtc(prev).endMs;
      const currStart = shiftBoundsUtc(curr).startMs;
      const restHours = (currStart - prevEnd) / 3_600_000;
      if (restHours > 0 && restHours < config.minRestBetweenShiftsHours) {
        findings.push({
          ruleId: "min_rest_between_shifts",
          severity: "violation",
          shiftIds: [prev.id, curr.id],
          message: `Ruhezeit zu kurz: ${restHours.toFixed(1)}h zwischen Schichten (≥ ${config.minRestBetweenShiftsHours}h, ArbZG §5).`,
          data: {
            actualHours: Math.round(restHours * 100) / 100,
            allowedHours: config.minRestBetweenShiftsHours,
          },
        });
      }
    }

    // §3 max weekly
    const byWeek = new Map<string, ShiftLike[]>();
    for (const s of sorted) {
      const k = isoWeekKey(s.date);
      const arr = byWeek.get(k) ?? [];
      arr.push(s);
      byWeek.set(k, arr);
    }
    for (const [week, weekly] of byWeek) {
      const totalHours = weekly.reduce((sum, s) => sum + netWorkMinutes(s), 0) / 60;
      if (totalHours > config.maxWeeklyHours) {
        findings.push({
          ruleId: "max_weekly_hours",
          severity: "violation",
          shiftIds: weekly.map((s) => s.id),
          message: `Wochen-Höchstarbeitszeit überschritten: ${totalHours.toFixed(1)}h (max. ${config.maxWeeklyHours}h, ArbZG §3).`,
          data: { week, actualHours: Math.round(totalHours * 100) / 100, allowedHours: config.maxWeeklyHours },
        });
      }
    }
  }

  return findings;
}

/**
 * 0–100-Score über alle Findings (Standard-Gewichtung).
 *  - violation = 10 Punkte Abzug
 *  - warn      =  3 Punkte Abzug
 */
export function complianceScore(findings: ArbZgFinding[]): {
  score: number;
  violations: number;
  warnings: number;
  perRule: Record<ArbZgRuleId, number>;
} {
  let score = 100;
  const perRule: Record<ArbZgRuleId, number> = {
    max_daily_hours: 0,
    max_weekly_hours: 0,
    min_break: 0,
    min_rest_between_shifts: 0,
  };
  let violations = 0;
  let warnings = 0;
  for (const f of findings) {
    perRule[f.ruleId] += 1;
    if (f.severity === "violation") {
      score -= 10;
      violations += 1;
    } else {
      score -= 3;
      warnings += 1;
    }
  }
  return { score: Math.max(0, score), violations, warnings, perRule };
}

/** Aggregierter, sprechbarer Label-String für UI-Pillen. */
export function shortLabelForRule(ruleId: ArbZgRuleId): string {
  switch (ruleId) {
    case "max_daily_hours":
      return "Tagesgrenze";
    case "max_weekly_hours":
      return "Wochengrenze";
    case "min_break":
      return "Pause";
    case "min_rest_between_shifts":
      return "Ruhezeit";
  }
}
