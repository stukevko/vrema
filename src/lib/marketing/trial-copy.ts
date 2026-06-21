import { PLANS } from "@/lib/plans";
import { TRIAL_DAYS, TRIAL_MAX_EMPLOYEES } from "@/lib/trial/constants";
import { FLYER_TRIAL_DAYS } from "@/lib/trial/referral";

/** Hero-Badge auf der Startseite. */
export function trialHeroBadge(): string {
  return `${TRIAL_DAYS} Tage gratis testen`;
}

/** Primärer Hero-/Nav-CTA. */
export function trialHeroCta(): string {
  return `${TRIAL_DAYS} Tage kostenlos testen`;
}

/** Zeile unter dem Hero-CTA. */
export function trialHeroSubline(): string {
  return `Voller Kern · bis zu ${TRIAL_MAX_EMPLOYEES} Mitarbeitende · keine Kreditkarte · danach Rechnung per Überweisung`;
}

/** Untertitel auf /auth/register (Flyer-/QR-Aktion). */
export function trialRegisterSubtitleForFlyer(): string {
  return `${FLYER_TRIAL_DAYS} Tage kostenlos testen — danach Tarif per Rechnung, persönliche Freischaltung.`;
}

/** Untertitel auf /auth/register */
export function trialRegisterSubtitle(): string {
  return `${TRIAL_DAYS} Tage kostenlos testen — danach Tarif per Rechnung, keine Kreditkarte.`;
}

/** Absatz unter CTAs (Features, Demo, Footer-CTA) */
export function trialMarketingParagraph(): string {
  return `${TRIAL_DAYS} Tage gratis testen — voller Kern. Danach Rechnung per Überweisung, persönliche Freischaltung.`;
}

/** Kurzzeile unter Pricing-Überschrift oder ROI-CTA */
export function trialPricingIntroLine(): string {
  return `${TRIAL_DAYS} Tage testen · danach Flatrate Petite & Major per Rechnung.`;
}

/** Abschluss-CTA auf der Landing (große Karte) */
export function trialLandingCtaLine(): string {
  return `${TRIAL_DAYS} Tage kostenlos testen — keine Kreditkarte, kein Risiko.`;
}

/** Demo: Was zum Start nötig ist */
export function trialDemoSignupLine(): string {
  return `E-Mail reicht. ${TRIAL_DAYS} Tage voller Zugang — danach kurz anfragen, wir schalten frei.`;
}

/** Kurzer Hinweis zu Tarifen (Features-Hero, Blog-CTA) */
export function pricingTiersHint(): string {
  return `Danach All-In — Petite ab ${PLANS.PETITE.monthlyPrice} €/Monat, Major ab ${PLANS.MAJOR.monthlyPrice} €/Monat.`;
}
