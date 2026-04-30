/**
 * Wandelt ganze Minuten in DATEV-kompatible Dezimalstunden (deutsches Format) um.
 * Beispiel: 90 -> "1,50"
 */
export function minutesToDatevDecimal(minutes: number): string {
  const normalizedMinutes = Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : 0;
  const decimalHours = normalizedMinutes / 60;
  return decimalHours.toFixed(2).replace(".", ",");
}

