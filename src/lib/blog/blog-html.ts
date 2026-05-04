/** Platzhalter im HTML — wird beim Rendern durch das YouTube-Embed ersetzt. */
export const BLOG_YOUTUBE_MARKER = "{{YOUTUBE}}";

/** Minimale Absicherung gegen Script-Einschleusung (Super-Admin-Inhalte). */
export function sanitizeBlogHtml(input: string): string {
  return input
    .replace(/<\/script/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .trim();
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}
