/** Canonical Site-URL für Metadata, Sitemap, robots, JSON-LD. */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  return "https://vrema.app";
}

export function resolveMetadataBase(): URL {
  return new URL(`${getSiteUrl()}/`);
}

/** Einheitliche SEO-Keywords (Gastro + Zeiterfassung). */
export const SEO_KEYWORDS = [
  "Gastro-Planung",
  "Schichtplanung Gastronomie",
  "Zeiterfassung Restaurant",
  "Digitale Zeiterfassung",
  "Stempeluhr",
  "DSGVO Zeiterfassung",
  "VREMA",
] as const;
