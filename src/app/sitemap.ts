import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const now = new Date();

  const entry = (
    path: string,
    changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"],
    priority: number,
  ): MetadataRoute.Sitemap[0] => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });

  return [
    entry("/", "weekly", 1),
    entry("/features", "weekly", 0.95),
    // `/preise` ist 308-redirect auf `/#pricing` (Landingpage-Anker) – kein eigener Sitemap-Eintrag.
    entry("/blog", "weekly", 0.75),
    entry("/partner", "monthly", 0.55),
    entry("/impressum", "yearly", 0.3),
    entry("/datenschutz", "yearly", 0.3),
    entry("/widerruf", "yearly", 0.2),
    entry("/cookies", "yearly", 0.2),
    entry("/agb", "yearly", 0.3),
    entry("/avv", "yearly", 0.3),
  ];
}
