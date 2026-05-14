import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Coffee,
  Hotel,
  LayoutGrid,
  Wine,
  PartyPopper,
  UtensilsCrossed,
  Warehouse,
} from "lucide-react";

/** Prisma-Enum `CompanyIndustry` – branchen-spezifisches Icon, sonst neutral. */
export type CompanyIndustryKey =
  | "RESTAURANT"
  | "CAFE"
  | "BAR"
  | "HOTEL"
  | "BAKERY"
  | "CANTEEN"
  | "CLUB"
  | "CATERING"
  | "OTHER";

const MAP: Record<CompanyIndustryKey, LucideIcon> = {
  RESTAURANT: UtensilsCrossed,
  CAFE: Coffee,
  BAR: Wine,
  HOTEL: Hotel,
  BAKERY: UtensilsCrossed,
  CANTEEN: Building2,
  CLUB: PartyPopper,
  CATERING: Warehouse,
  OTHER: LayoutGrid,
};

export function categoryIconForIndustry(industry: string | null | undefined): LucideIcon {
  if (!industry) return LayoutGrid;
  const key = industry.toUpperCase() as CompanyIndustryKey;
  return MAP[key] ?? LayoutGrid;
}

type CategoryIconProps = {
  industry: string | null | undefined;
  className?: string;
  "aria-hidden"?: boolean;
};

/** Kleines Icon für Branche – dynamisch nach Tenant, Fallback immer neutral (Raster). */
export function CategoryIcon({ industry, className, ...rest }: CategoryIconProps) {
  const Icon = categoryIconForIndustry(industry);
  return <Icon className={className} {...rest} />;
}
