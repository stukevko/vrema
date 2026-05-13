/**
 * Custom-Branding-Loader
 * ──────────────────────
 *  - Liest `brandColor` / `brandColorDark` der Firma aus der DB.
 *  - Konvertiert Hex → HSL-Tripel (`H S% L%`), weil VREMA-Tailwind alle Brand-
 *    Tokens als `hsl(var(--brand))` referenziert.
 *  - Erzeugt eine `<style>`-Snippet-Zeichenkette, die im Dashboard-Layout
 *    injiziert wird und die globalen `--brand*`-Variablen überschreibt.
 *
 *  Designentscheidung: KEINE Tailwind-Class-Rewrites zur Build-Zeit.
 *  Stattdessen CSS-Variable-Override zur Render-Zeit → null Build-Overhead,
 *  funktioniert auch in Server Components & PWA.
 */

import { db } from "@/lib/db";

const DEFAULT_BRAND_HEX = "#0a3a52";
const DEFAULT_BRAND_HEX_DARK = "#38BDF8";

export type CompanyBrand = {
  brandHex: string;
  brandHexDark: string;
  brandHsl: string;
  brandSoftHsl: string;
  brandHoverHsl: string;
  brandForegroundHsl: string;
  brandHslDark: string;
  brandSoftHslDark: string;
  brandHoverHslDark: string;
  brandForegroundHslDark: string;
};

const HEX_REGEX = /^#?([0-9a-fA-F]{6})$/;

/** Validiert + normalisiert ein Hex-Tripel zu `#rrggbb`. */
export function normalizeHex(input: string | null | undefined, fallback: string): string {
  if (!input) return fallback;
  const trimmed = input.trim();
  const match = trimmed.match(HEX_REGEX);
  if (!match) return fallback;
  return `#${match[1].toLowerCase()}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Bestimmt, ob ein Hex-Wert für Light-Mode "dunkel genug" ist, damit weiße Schrift passt. */
function isDarkColor(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.65;
}

function tripleToString(h: number, s: number, l: number) {
  return `${h} ${s}% ${l}%`;
}

/**
 * Wandelt einen Brand-Hex in das vollständige Set aus Brand-Tokens.
 * Light-Mode bekommt eine sehr helle Variante als "soft", Dark eine sehr dunkle.
 */
function buildHslTriples(hex: string, mode: "light" | "dark"): {
  base: string;
  hover: string;
  soft: string;
  foreground: string;
} {
  const { h, s, l } = rgbToHsl(...Object.values(hexToRgb(hex)) as [number, number, number]);
  if (mode === "light") {
    const baseS = Math.min(95, s);
    const baseL = Math.min(50, Math.max(28, l)); // pro Akzent kein 95 %er Banane-Look
    return {
      base: tripleToString(h, baseS, baseL),
      hover: tripleToString(h, baseS, Math.max(20, baseL - 8)),
      soft: tripleToString(h, Math.min(95, Math.max(40, baseS)), 95), // sehr helle Pille
      foreground: isDarkColor(hex) ? "0 0% 100%" : "222 47% 12%",
    };
  }
  // dark
  const baseSDark = Math.max(50, Math.min(95, s));
  const baseLDark = Math.min(70, Math.max(45, l + 10)); // Hellere Variante für Anthrazit
  return {
    base: tripleToString(h, baseSDark, baseLDark),
    hover: tripleToString(h, baseSDark, Math.min(85, baseLDark + 7)),
    soft: tripleToString(h, Math.max(40, baseSDark - 25), 18), // tiefe Pille
    foreground: tripleToString(h, Math.max(30, baseSDark - 30), 8),
  };
}

export async function getCompanyBranding(companyId: string): Promise<CompanyBrand> {
  const company = await db.company
    .findUnique({
      where: { id: companyId },
      select: { brandColor: true, brandColorDark: true },
    })
    .catch(() => null);

  const brandHex = normalizeHex(company?.brandColor, DEFAULT_BRAND_HEX);
  const brandHexDark = normalizeHex(company?.brandColorDark, DEFAULT_BRAND_HEX_DARK);

  const light = buildHslTriples(brandHex, "light");
  const dark = buildHslTriples(brandHexDark, "dark");

  return {
    brandHex,
    brandHexDark,
    brandHsl: light.base,
    brandSoftHsl: light.soft,
    brandHoverHsl: light.hover,
    brandForegroundHsl: light.foreground,
    brandHslDark: dark.base,
    brandSoftHslDark: dark.soft,
    brandHoverHslDark: dark.hover,
    brandForegroundHslDark: dark.foreground,
  };
}

/**
 * Baut einen CSS-Snippet (ohne `<style>`-Tags) für die Variable-Overrides.
 * Wir setzen den `data-tenant-brand`-Attribut-Selektor, damit das Override
 * NUR in den Dashboard-Pfaden zieht – die Marketing-Site bleibt VREMA-Petrol.
 */
export function buildBrandStyleCss(brand: CompanyBrand): string {
  return `
[data-tenant-brand="custom"] {
  --brand: ${brand.brandHsl};
  --brand-hover: ${brand.brandHoverHsl};
  --brand-soft: ${brand.brandSoftHsl};
  --brand-foreground: ${brand.brandForegroundHsl};
  --color-brand: hsl(${brand.brandHsl});
  --color-brand-soft: hsl(${brand.brandSoftHsl});
  --color-brand-foreground: hsl(${brand.brandForegroundHsl});
  --ring: ${brand.brandHsl};
}
.dark [data-tenant-brand="custom"] {
  --brand: ${brand.brandHslDark};
  --brand-hover: ${brand.brandHoverHslDark};
  --brand-soft: ${brand.brandSoftHslDark};
  --brand-foreground: ${brand.brandForegroundHslDark};
  --color-brand: hsl(${brand.brandHslDark});
  --color-brand-soft: hsl(${brand.brandSoftHslDark});
  --color-brand-foreground: hsl(${brand.brandForegroundHslDark});
  --ring: ${brand.brandHslDark};
}
  `.trim();
}

export const VREMA_DEFAULT_BRAND_HEX = DEFAULT_BRAND_HEX;
export const VREMA_DEFAULT_BRAND_HEX_DARK = DEFAULT_BRAND_HEX_DARK;
