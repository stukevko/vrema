import { PLANS } from "@/lib/plans";

/** Untertitel auf /auth/register (Flyer-/QR-Aktion). */
export function trialRegisterSubtitleForFlyer(): string {
  return "Zugang anfordern — persönliche Freischaltung, Rechnung per Überweisung.";
}

/** Untertitel auf /auth/register */
export function trialRegisterSubtitle(): string {
  return "Zugang anfordern — wir melden uns zur Freischaltung. Rechnung per Überweisung, keine Kreditkarte.";
}

/** Absatz unter CTAs (Features, Demo, Footer-CTA) */
export function trialMarketingParagraph(): string {
  return "Persönliche Freischaltung nach kurzer Prüfung. Keine Kreditkarte — monatliche Rechnung per Überweisung.";
}

/** Kurzzeile unter Pricing-Überschrift oder ROI-CTA */
export function trialPricingIntroLine(): string {
  return "Flatrate Petite & Major · Rechnung statt Kreditkarte.";
}

/** Abschluss-CTA auf der Landing (große Karte) */
export function trialLandingCtaLine(): string {
  return "Zugang anfordern — wir schalten persönlich frei. Keine Kreditkarte.";
}

/** Demo: Was zum Start nötig ist */
export function trialDemoSignupLine(): string {
  return "E-Mail reicht. Kurze Freischaltung durch unser Team — dann sofort loslegen.";
}

/** Kurzer Hinweis zu Tarifen (Features-Hero, Blog-CTA) */
export function pricingTiersHint(): string {
  return `All-In-Tarife — Petite ab ${PLANS.PETITE.monthlyPrice} €/Monat, Major ab ${PLANS.MAJOR.monthlyPrice} €/Monat.`;
}
