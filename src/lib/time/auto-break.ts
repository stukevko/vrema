import { DEFAULT_ARBZG_CONFIG, type ArbZgConfig } from "@/lib/compliance/arbzg";
import { grossWorkedMinutes, type WorkLogLike } from "@/lib/time/payroll";

/** Pflichtpause in Minuten aus Brutto-Arbeitszeit (ArbZG §4, Defaults). */
export function requiredBreakMinutesForGross(
  grossMinutes: number,
  config: ArbZgConfig = DEFAULT_ARBZG_CONFIG,
): number {
  if (!Number.isFinite(grossMinutes) || grossMinutes <= 0) return 0;
  const hours = grossMinutes / 60;
  if (hours <= config.breakRequiredAfterHours) return 0;
  if (hours > config.longBreakRequiredAfterHours) return config.longBreakRequiredMinutes;
  return config.breakRequiredMinutes;
}

/**
 * Effektive Pause: gestempelt oder automatisch aufgeschlagen, wenn zu wenig.
 * Nie kleiner als gesetzlich nötig, nie kleiner als manuell erfasst.
 */
export function resolveEffectiveBreakMins(
  log: WorkLogLike,
  config: ArbZgConfig = DEFAULT_ARBZG_CONFIG,
  grossMinutes?: number,
): number {
  const recorded = Math.max(0, Math.floor(log.breakMins || 0));
  if (!log.clockOut) return recorded;

  const gross = grossMinutes ?? grossWorkedMinutes(log);
  if (gross <= 0) return recorded;

  const required = requiredBreakMinutesForGross(gross, config);
  return Math.max(recorded, required);
}

/** Beim Ausstempeln / Schließen: fehlende Pflichtpause ergänzen und Hinweis setzen. */
export function finalizeBreakMinutesOnClose(params: {
  clockIn: Date;
  clockOut: Date;
  breakMins: number;
  note?: string | null;
  config?: ArbZgConfig;
}): { breakMins: number; note: string | null; autoAddedMins: number } {
  const recorded = Math.max(0, Math.floor(params.breakMins || 0));
  const effective = resolveEffectiveBreakMins(
    {
      clockIn: params.clockIn,
      clockOut: params.clockOut,
      breakMins: recorded,
    },
    params.config,
  );
  const autoAdded = effective - recorded;

  let note = params.note?.trim() ? params.note.trim() : null;
  if (autoAdded > 0) {
    const tag = `Pause automatisch ergänzt (ArbZG §4): ${autoAdded} Min`;
    note = note && !note.includes("Pause automatisch ergänzt") ? `${note} | ${tag}` : note ?? tag;
  }

  return { breakMins: effective, note, autoAddedMins: autoAdded };
}
