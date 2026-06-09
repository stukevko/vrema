/** Onboarding-Branche ↔ Prisma `CompanyIndustry` */

import type { ShiftVocabulary } from "@/lib/vocabulary";
import { defaultVocabularyForIndustry } from "@/lib/vocabulary";

export const ONBOARDING_INDUSTRY_IDS = [
  "restaurant",
  "cafe",
  "bar",
  "hotel",
  "bakery",
  "canteen",
  "craft",
  "care",
  "retail",
  "logistics",
  "field_service",
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
  craft: "OTHER",
  care: "OTHER",
  retail: "OTHER",
  logistics: "OTHER",
  field_service: "OTHER",
  other: "OTHER",
};

/** Vokabular-Preset je Onboarding-Branche (nicht-Gastro → OTHER in DB). */
export function defaultVocabularyForOnboardingIndustry(id: OnboardingIndustryId): ShiftVocabulary {
  switch (id) {
    case "craft":
      return "ASSIGNMENT";
    case "care":
      return "DUTY";
    case "logistics":
    case "field_service":
      return "ASSIGNMENT";
    case "retail":
    case "restaurant":
    case "cafe":
    case "bar":
    case "hotel":
    case "bakery":
    case "canteen":
      return "SHIFT";
    default:
      return defaultVocabularyForIndustry("OTHER");
  }
}

export function onboardingIndustryToDb(id: string): CompanyIndustryValue {
  if (id in TO_DB) return TO_DB[id as OnboardingIndustryId];
  return "OTHER";
}

export function dbIndustryToOnboarding(industry: string | null | undefined): OnboardingIndustryId {
  if (!industry) return "other";
  const key = industry.toLowerCase() as OnboardingIndustryId;
  return key in TO_DB ? key : "other";
}
