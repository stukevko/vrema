/** Kostenlose Testphase für neue Betriebe (ohne Stripe-Abo). */
export const TRIAL_DAYS = 7;
export const TRIAL_MAX_EMPLOYEES = 3;

export function computeTrialEndsAt(from = new Date()): Date {
  return new Date(from.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}
