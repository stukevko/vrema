/** Anzeige & Validierung von Schichtzeiten im Planer. */

export type ShiftSlotKind = "morning" | "day" | "evening" | "night";

export function parseShiftMinutes(value: string): number | null {
  if (!/^\d{1,2}:\d{2}/.test(value)) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m) || m < 0 || m > 59) return null;
  if (h === 24 && m === 0) return 24 * 60;
  if (h < 0 || h > 23) return null;
  return h * 60 + m;
}

export function shiftDurationMinutes(start: string, end: string): number {
  const startMinutes = parseShiftMinutes(start);
  const endMinutes = parseShiftMinutes(end);
  if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) return 0;
  if (startMinutes === 0 && endMinutes >= 24 * 60) return 0;
  return endMinutes > startMinutes ? endMinutes - startMinutes : 24 * 60 - startMinutes + endMinutes;
}

export function shiftNetDurationMinutes(start: string, end: string, breakDuration = 0): number {
  return Math.max(0, shiftDurationMinutes(start, end) - Math.max(0, breakDuration));
}

/** Offensichtlich kaputte Timeline-Zeiten (voller Tag, Mitternacht-Falle). */
export function isSuspiciousShiftTime(start: string, end: string): boolean {
  const s = parseShiftMinutes(start);
  const e = parseShiftMinutes(end);
  if (s === null || e === null) return true;
  if (s === 0 && e >= 24 * 60) return true;
  const dur = shiftDurationMinutes(start, end);
  return dur <= 0 || dur > 16 * 60;
}

export function shiftSlotKind(start: string): ShiftSlotKind {
  const m = parseShiftMinutes(start);
  if (m === null || m < 10 * 60) return "night";
  if (m < 12 * 60) return "morning";
  if (m < 17 * 60) return "day";
  if (m < 22 * 60) return "evening";
  return "night";
}

const SLOT_LABEL: Record<ShiftSlotKind, string> = {
  morning: "Früh",
  day: "Tag",
  evening: "Spät",
  night: "Nacht",
};

export function shiftSlotLabel(start: string): string {
  return SLOT_LABEL[shiftSlotKind(start)];
}

const SLOT_TITLES: Record<ShiftSlotKind, string> = {
  morning: "Frühschicht",
  day: "Tagschicht",
  evening: "Spätschicht",
  night: "Nachtschicht",
};

export function shiftSlotTitle(start: string): string {
  return SLOT_TITLES[shiftSlotKind(start)];
}

export function formatShiftTime(value: string): string {
  const m = parseShiftMinutes(value);
  if (m === null) return value.slice(0, 5);
  if (m >= 24 * 60) return "24:00";
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Lesbare Schichtspanne für Karten (ohne 00:00–24:00-Artefakte). */
export function formatShiftRange(start: string, end: string): string {
  if (isSuspiciousShiftTime(start, end)) return "Zeit prüfen";
  const s = formatShiftTime(start);
  const e = formatShiftTime(end);
  return `${s}–${e}`;
}

export function shiftCardTone(start: string, suspicious: boolean): string {
  if (suspicious) {
    return "border-danger/50 bg-danger-soft/80 text-danger-foreground ring-1 ring-danger/25";
  }
  const kind = shiftSlotKind(start);
  if (kind === "morning") {
    return "border-amber-300/70 bg-gradient-to-b from-amber-50 to-amber-100/90 text-amber-950 dark:border-amber-500/35 dark:from-amber-500/15 dark:to-amber-500/8 dark:text-amber-100";
  }
  if (kind === "day") {
    return "border-sky-300/70 bg-gradient-to-b from-sky-50 to-sky-100/90 text-sky-950 dark:border-sky-500/35 dark:from-sky-500/15 dark:to-sky-500/8 dark:text-sky-100";
  }
  if (kind === "evening") {
    return "border-violet-300/70 bg-gradient-to-b from-violet-50 to-violet-100/90 text-violet-950 dark:border-violet-500/35 dark:from-violet-500/15 dark:to-violet-500/8 dark:text-violet-100";
  }
  return "border-slate-300/70 bg-gradient-to-b from-slate-50 to-slate-100/90 text-slate-900 dark:border-white/15 dark:from-white/10 dark:to-white/5 dark:text-slate-100";
}

/** Speichern: 24:00 → 23:45, keine Volltag-Schicht. */
function padHHMM(value: string): string {
  const raw = value.trim().slice(0, 5);
  const [h, m] = raw.split(":");
  if (!h || m === undefined) return raw;
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

export function normalizeShiftTimesForSave(startTime: string, endTime: string): { startTime: string; endTime: string } {
  let start = padHHMM(startTime);
  let end = padHHMM(endTime);
  if (end === "24:00") end = "23:45";
  if (isSuspiciousShiftTime(start, end)) {
    throw new Error("Ungültige Schichtzeit. Bitte realistische Start- und Endzeit wählen (max. 16 h).");
  }
  return { startTime: start, endTime: end };
}
