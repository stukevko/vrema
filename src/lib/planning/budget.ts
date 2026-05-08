/**
 * Lohn-Vergleich bei Schichttausch (heuristisch, Brutto-Stundenlohn).
 */

export type TradeWageComparison = {
  ownerHourly: number | null;
  acquirerHourly: number | null;
  deltaPerHour: number | null;
  acquirerMoreExpensive: boolean;
};

export function compareTradeHourlyCost(
  ownerHourly: number | null | undefined,
  acquirerHourly: number | null | undefined
): TradeWageComparison {
  const o = ownerHourly != null && Number.isFinite(ownerHourly) ? ownerHourly : null;
  const a = acquirerHourly != null && Number.isFinite(acquirerHourly) ? acquirerHourly : null;
  if (o == null || a == null) {
    return { ownerHourly: o, acquirerHourly: a, deltaPerHour: null, acquirerMoreExpensive: false };
  }
  const delta = a - o;
  return {
    ownerHourly: o,
    acquirerHourly: a,
    deltaPerHour: Math.round(delta * 100) / 100,
    acquirerMoreExpensive: delta > 0.01,
  };
}

export function estimatedExtraCostForShift(
  netHours: number,
  deltaPerHour: number | null
): number | null {
  if (deltaPerHour == null) return null;
  return Math.round(netHours * deltaPerHour * 100) / 100;
}
