import { TRIAL_DAYS, TRIAL_MAX_EMPLOYEES } from "@/lib/trial/constants";
import { FLYER_TRIAL_DAYS } from "@/lib/trial/referral";

function cardRequiredOnSignup(): boolean {
  return (
    process.env.NEXT_PUBLIC_REQUIRE_CARD_ON_SIGNUP === "true" ||
    process.env.REQUIRE_CARD_ON_SIGNUP === "true"
  );
}

const trialCore = () =>
  `${TRIAL_DAYS} Tage testen · bis ${TRIAL_MAX_EMPLOYEES} Mitarbeitende`;

/** Untertitel auf /auth/register (Flyer-Aktion Speyer). */
export function trialRegisterSubtitleForFlyer(): string {
  return `${FLYER_TRIAL_DAYS} Tage kostenlos testen · Speyer-Aktion — keine Kreditkarte, Abrechnung erst danach.`;
}

/** Untertitel auf /auth/register */
export function trialRegisterSubtitle(): string {
  if (cardRequiredOnSignup()) {
    return `${trialCore()} — kurze Kartenprüfung (0 €), Abrechnung erst nach der Testphase.`;
  }
  return `${trialCore()} — keine Kreditkarte, Abrechnung erst wenn du weitermachst.`;
}

/** Absatz unter CTAs (Features, Demo, Footer-CTA) */
export function trialMarketingParagraph(): string {
  if (cardRequiredOnSignup()) {
    return `${trialCore()}. Kartenprüfung zur Echtheit (0 €) — Abrechnung erst danach. Voller Kern in der Testphase.`;
  }
  return `${trialCore()}. Keine Kreditkarte. Voller Kern in der Testphase.`;
}

/** Kurzzeile unter Pricing-Überschrift oder ROI-CTA */
export function trialPricingIntroLine(): string {
  if (cardRequiredOnSignup()) {
    return `${TRIAL_DAYS} Tage Testphase · max. ${TRIAL_MAX_EMPLOYEES} MA. Kartenprüfung 0 €.`;
  }
  return `${TRIAL_DAYS} Tage testen · max. ${TRIAL_MAX_EMPLOYEES} Mitarbeitende · keine Kreditkarte.`;
}

/** Abschluss-CTA auf der Landing (große Karte) */
export function trialLandingCtaLine(): string {
  if (cardRequiredOnSignup()) {
    return `${trialCore()}. Kartenprüfung 0 €, keine Sofortbelastung.`;
  }
  return `${trialCore()}. Keine Kreditkarte. Keine Verpflichtung.`;
}

/** Demo: Was zum Start nötig ist */
export function trialDemoSignupLine(): string {
  if (cardRequiredOnSignup()) {
    return `E-Mail reicht. ${trialCore()} — kurze Kartenprüfung (0 €) beim Setup.`;
  }
  return `E-Mail reicht. ${trialCore()} — keine Demo-Termin-Kette, einfach loslegen.`;
}

/** Kurzer Hinweis zu Tarifen (Features-Hero, Blog-CTA) */
export function pricingTiersHint(): string {
  return `Danach feste Tarife nach Teamgröße — Starter ab 29 €/Monat, Business ab 79 €/Monat.`;
}
