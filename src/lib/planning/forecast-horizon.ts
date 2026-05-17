import { dayOrderMonFirst } from "@/lib/planning/cycle-display-date";
import { getWeekCycleIndex, normalizeCycleWeeks } from "@/lib/shift-cycle";
import { berlinDateKeyToDayOfWeek, getBerlinDateKey } from "@/lib/time/timezone";

export type ForecastWeekSlot = {
  /** Montag der Kalenderwoche (YYYY-MM-DD, Berlin). */
  weekStart: string;
  /** Planer-Woche im Schichtzyklus (1–3). */
  weekIndex: 1 | 2 | 3;
  label: string;
  /** Erste Zeile = die Woche, die du jetzt typischerweise planst. */
  isPrimary: boolean;
};

function addDaysIso(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + days * 86_400_000;
  const nd = new Date(t);
  const mm = String(nd.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(nd.getUTCDate()).padStart(2, "0");
  return `${nd.getUTCFullYear()}-${mm}-${dd}`;
}

/** Montag der Berlin-Kalenderwoche, die `date` enthält. */
export function getBerlinMondayKey(date: Date = new Date()): string {
  const day = getBerlinDateKey(date);
  const dow = berlinDateKeyToDayOfWeek(day);
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  return addDaysIso(day, offsetToMonday);
}

/**
 * Ab Freitag / Wochenende / Sonntag liegt der Planungsfokus auf der **nächsten** KW,
 * nicht auf der fast abgelaufenen.
 */
export function isPlanningHandoffWindow(date: Date = new Date()): boolean {
  const dow = berlinDateKeyToDayOfWeek(getBerlinDateKey(date));
  return dow === 0 || dow === 5 || dow === 6;
}

export function formatWeekRangeLabel(weekStartIso: string): string {
  const start = new Date(`${weekStartIso}T12:00:00Z`);
  const end = new Date(start.getTime() + 6 * 86_400_000);
  const fmt = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Berlin",
  });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

/**
 * Baut die vorwärts gerichteten Planungswochen für Personal-Vorhersage & Dashboard.
 * - 1-Wochen-Zyklus: nächste 2 Kalenderwochen (Blick voraus beim Sonntags-Planen).
 * - 2/3-Wochen-Zyklus: alle Zyklus-Wochen ab Planungsfokus.
 */
export function buildForecastHorizon(
  shiftCycleWeeks: number | null | undefined,
  fromDate: Date = new Date(),
): ForecastWeekSlot[] {
  const cycle = normalizeCycleWeeks(shiftCycleWeeks);
  const horizonCount = cycle === 1 ? 2 : cycle;
  const thisMonday = getBerlinMondayKey(fromDate);
  const firstMonday = isPlanningHandoffWindow(fromDate) ? addDaysIso(thisMonday, 7) : thisMonday;

  const slots: ForecastWeekSlot[] = [];
  for (let i = 0; i < horizonCount; i++) {
    const weekStart = addDaysIso(firstMonday, i * 7);
    const midWeekKey = addDaysIso(weekStart, dayOrderMonFirst(3));
    const weekIndex = getWeekCycleIndex(new Date(`${midWeekKey}T12:00:00Z`), cycle);
    slots.push({
      weekStart,
      weekIndex,
      label: formatWeekRangeLabel(weekStart),
      isPrimary: i === 0,
    });
  }
  return slots;
}
