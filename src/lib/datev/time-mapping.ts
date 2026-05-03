/**
 * Wandelt ganze Minuten in DATEV-/Lohn-CSV-taugliche Dezimalstunden (Deutschland: Dezimaltrennzeichen Komma) um.
 * Beispiel: 90 -> "1,50"
 * Hinweis: Datumsangaben im Export strikt TT.MM.JJJJ separat formatieren (siehe ReportsClient / payroll-CSV).
 */
export function minutesToDatevDecimal(minutes: number): string {
  const normalizedMinutes = Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : 0;
  const decimalHours = normalizedMinutes / 60;
  return decimalHours.toFixed(2).replace(".", ",");
}

