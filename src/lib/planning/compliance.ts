export type ShiftPlanRow = {
  id: string;
  userId: string;
  weekIndex: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type PlanComplianceFlags = { pauseRisk: boolean; restRisk: boolean };

const MIN_REST_MINUTES = 11 * 60;
const PAUSE_RULE_WORK_MINUTES = 6 * 60;

/** Montag = 0 … Sonntag = 6 (Lesart innerhalb einer Planwoche) */
function dayOrderMonFirst(dayOfWeek: number): number {
  return (dayOfWeek + 6) % 7;
}

function toMinutes(value: string): number | null {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function shiftDurationMinutes(start: string, end: string): number {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) return 0;
  return endMinutes > startMinutes ? endMinutes - startMinutes : 24 * 60 - startMinutes + endMinutes;
}

/** Eindeutige Minute innerhalb der Zykluswoche (weekIndex, Mo–So) */
function weekMinuteStart(weekIndex: number, dayOfWeek: number, startTime: string): number {
  const sm = toMinutes(startTime);
  if (sm === null) return 0;
  return (weekIndex - 1) * 7 * 1440 + dayOrderMonFirst(dayOfWeek) * 1440 + sm;
}

function weekMinuteEnd(shift: ShiftPlanRow): number {
  return weekMinuteStart(shift.weekIndex, shift.dayOfWeek, shift.startTime) + shiftDurationMinutes(shift.startTime, shift.endTime);
}

/**
 * Pausen-Hinweis: Schicht &gt; 6h ohne separaten Pausen-Eintrag im Modell (nur Soll-Zeitspanne).
 * Ruhezeit: &lt; 11h zwischen aufeinanderfolgenden Schichten desselben MA in derselben Zykluswoche.
 */
export function buildComplianceFlagsByShiftId(shifts: ShiftPlanRow[], weekIndex: number): Map<string, PlanComplianceFlags> {
  const map = new Map<string, PlanComplianceFlags>();
  const weekShifts = shifts.filter((s) => s.weekIndex === weekIndex);
  const byUser = new Map<string, ShiftPlanRow[]>();
  for (const s of weekShifts) {
    if (!byUser.has(s.userId)) byUser.set(s.userId, []);
    byUser.get(s.userId)!.push(s);
  }
  for (const list of byUser.values()) {
    const sorted = [...list].sort(
      (a, b) => weekMinuteStart(weekIndex, a.dayOfWeek, a.startTime) - weekMinuteStart(weekIndex, b.dayOfWeek, b.startTime)
    );
    for (let i = 0; i < sorted.length; i++) {
      const sh = sorted[i];
      const dur = shiftDurationMinutes(sh.startTime, sh.endTime);
      const pauseRisk = dur > PAUSE_RULE_WORK_MINUTES;
      let restRisk = false;
      if (i > 0) {
        const prev = sorted[i - 1];
        const startCur = weekMinuteStart(weekIndex, sh.dayOfWeek, sh.startTime);
        const endPrev = weekMinuteEnd(prev);
        const gap = startCur - endPrev;
        if (gap < MIN_REST_MINUTES) restRisk = true;
      }
      map.set(sh.id, { pauseRisk, restRisk });
    }
  }
  return map;
}
