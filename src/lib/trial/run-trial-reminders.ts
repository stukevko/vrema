export type TrialReminderReport = {
  scanned: number;
  sent: number;
  skipped: number;
  errors: number;
  executedAt: string;
};

/** Manuelle Abrechnung — Cron bleibt als No-Op kompatibel. */
export async function runTrialReminders(): Promise<TrialReminderReport> {
  return {
    scanned: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
    executedAt: new Date().toISOString(),
  };
}
