export type WorkLogLike = {
  clockIn: Date | string;
  clockOut: Date | string | null;
  breakMins: number;
};

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function workedMinutes(log: WorkLogLike): number {
  if (!log.clockOut) return 0;
  const start = toDate(log.clockIn).getTime();
  const end = toDate(log.clockOut).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  const totalMinutes = Math.round((end - start) / 60000);
  return Math.max(0, totalMinutes - Math.max(0, Math.floor(log.breakMins || 0)));
}

export function sumWorkedMinutes<T extends WorkLogLike>(logs: T[]): number {
  return logs.reduce((sum, log) => sum + workedMinutes(log), 0);
}

export function minutesToDecimalHours(minutes: number, scale = 2): string {
  return (minutes / 60).toFixed(scale);
}

export function wageTypeForMinutes(minutes: number): { code: "001" | "002"; text: string } {
  if (minutes > 0) return { code: "001", text: "Arbeitszeit" };
  return { code: "001", text: "Arbeitszeit" };
}

