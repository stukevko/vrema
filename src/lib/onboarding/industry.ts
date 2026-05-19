/** Onboarding-Branche ↔ Prisma `CompanyIndustry` */

export const ONBOARDING_INDUSTRY_IDS = [
  "restaurant",
  "cafe",
  "bar",
  "hotel",
  "bakery",
  "canteen",
  "other",
] as const;

export type OnboardingIndustryId = (typeof ONBOARDING_INDUSTRY_IDS)[number];

export type CompanyIndustryValue =
  | "RESTAURANT"
  | "CAFE"
  | "BAR"
  | "HOTEL"
  | "BAKERY"
  | "CANTEEN"
  | "CLUB"
  | "CATERING"
  | "OTHER";

const TO_DB: Record<OnboardingIndustryId, CompanyIndustryValue> = {
  restaurant: "RESTAURANT",
  cafe: "CAFE",
  bar: "BAR",
  hotel: "HOTEL",
  bakery: "BAKERY",
  canteen: "CANTEEN",
  other: "OTHER",
};

export function onboardingIndustryToDb(id: string): CompanyIndustryValue {
  if (id in TO_DB) return TO_DB[id as OnboardingIndustryId];
  return "OTHER";
}

export function dbIndustryToOnboarding(industry: string | null | undefined): OnboardingIndustryId {
  if (!industry) return "restaurant";
  const key = industry.toLowerCase() as OnboardingIndustryId;
  return key in TO_DB ? key : "other";
}
