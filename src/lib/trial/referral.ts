/** Flyer-/QR-Aktionen: 30 Tage kostenlos ohne Stripe-Zwang. */
export const FLYER_TRIAL_DAYS = 30;

/**
 * Aktive Flyer-/QR-Kampagnen (Allowlist – schützt vor „Gratis-30-Tage" über
 * beliebige `?ref=`-Links). Eine neue Stadt/Aktion freischalten = HIER EINE
 * Zeile ergänzen. Pro Eintrag gelten der Code selbst sowie Unter-Codes mit
 * `-` oder `_` (z. B. "speyer" deckt "speyer-altstadt" und "speyer_dom" ab).
 */
export const FLYER_CAMPAIGN_CODES = ["speyer"] as const;

/** Liefert den Kampagnen-Basiscode, dem ein Ref-Code zugeordnet ist (oder null). */
function matchedFlyerCampaign(code: string): string | null {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;
  return (
    FLYER_CAMPAIGN_CODES.find(
      (c) => normalized === c || normalized.startsWith(`${c}-`) || normalized.startsWith(`${c}_`),
    ) ?? null
  );
}

/** Entspricht date-fns `addDays` — bewusst ohne Extra-Dependency. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function normalizeReferralCode(raw: string): string {
  return raw.trim().toLowerCase().slice(0, 80);
}

/** Öffentliche Kampagnen-URL für Flyer/QR (kurz: /ref/speyer). */
export function publicCampaignRefUrl(code: string): string {
  const ref = normalizeReferralCode(code);
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "https://vrema.app").replace(
    /\/$/,
    "",
  );
  if (!ref) return `${base}/auth/register`;
  return `${base}/ref/${encodeURIComponent(ref)}`;
}

/**
 * Kampagnen-Refs aus Flyern/QR (z. B. ?ref=speyer, ?ref=speyer-altstadt).
 * Affiliate-Codes werden separat über die Affiliate-Tabelle aufgelöst.
 */
export function isFlyerReferralCode(code: string): boolean {
  return matchedFlyerCampaign(code) !== null;
}

export function computeFlyerTrialEndsAt(from = new Date()): Date {
  return addDays(from, FLYER_TRIAL_DAYS);
}

/** Prisma-`where`-Fragment: alle Firmen aus aktiven Flyer-/QR-Kampagnen. */
export function flyerReferralCompanyFilters(): Array<
  { referredBy: string } | { referredBy: { startsWith: string } }
> {
  return FLYER_CAMPAIGN_CODES.flatMap((code) => [
    { referredBy: code },
    { referredBy: { startsWith: `${code}-` } },
    { referredBy: { startsWith: `${code}_` } },
  ]);
}

export function flyerReferralDisplayName(code: string): string {
  const campaign = matchedFlyerCampaign(code);
  if (campaign) {
    return `${campaign.charAt(0).toUpperCase()}${campaign.slice(1)} Flyer-Aktion`;
  }
  return normalizeReferralCode(code);
}
