/** Flyer-Aktion Speyer: 30 Tage kostenlos ohne Stripe-Zwang. */
export const FLYER_TRIAL_DAYS = 30;

/** Entspricht date-fns `addDays` — bewusst ohne Extra-Dependency. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function normalizeReferralCode(raw: string): string {
  return raw.trim().toLowerCase().slice(0, 80);
}

/**
 * Kampagnen-Refs aus Flyern/QR (z. B. ?ref=speyer, ?ref=speyer-altstadt).
 * Affiliate-Codes werden separat über die Affiliate-Tabelle aufgelöst.
 */
export function isFlyerReferralCode(code: string): boolean {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return false;
  return (
    normalized === "speyer" ||
    normalized.startsWith("speyer-") ||
    normalized.startsWith("speyer_")
  );
}

export function computeFlyerTrialEndsAt(from = new Date()): Date {
  return addDays(from, FLYER_TRIAL_DAYS);
}

export function flyerReferralDisplayName(code: string): string {
  const n = normalizeReferralCode(code);
  if (n === "speyer" || n.startsWith("speyer")) return "Speyer Flyer-Aktion";
  return n;
}
