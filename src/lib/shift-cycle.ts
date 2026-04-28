export function getIsoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function normalizeCycleWeeks(value: number | null | undefined): 1 | 2 | 3 {
  if (value === 2) return 2;
  if (value === 3) return 3;
  return 1;
}

export function getWeekCycleIndex(date: Date, cycleWeeks: number | null | undefined): 1 | 2 | 3 {
  const normalized = normalizeCycleWeeks(cycleWeeks);
  if (normalized === 1) return 1;
  const isoWeek = getIsoWeekNumber(date);
  const index = ((isoWeek - 1) % normalized) + 1;
  return index as 1 | 2 | 3;
}
