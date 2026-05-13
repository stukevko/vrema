import sanitizeHtmlLib from "sanitize-html";

/** Platzhalter im HTML — wird beim Rendern durch das YouTube-Embed ersetzt. */
export const BLOG_YOUTUBE_MARKER = "{{YOUTUBE}}";

/**
 * Allowlist-basierte HTML-Sanitization für Super-Admin-Blog-Inhalte.
 *
 * Da Blog-Seiten **öffentlich** sind, ist robuste Sanitization Pflicht:
 * verhindert Stored-XSS via Event-Handler-Attribute (`onerror`), JS-URLs
 * (`href="javascript:..."`) und ähnliche Vektoren.
 */
export function sanitizeBlogHtml(input: string): string {
  if (!input) return "";

  return sanitizeHtmlLib(input, {
    allowedTags: [
      // Block-Level
      "p", "br", "hr",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li",
      "blockquote", "pre", "code",
      "table", "thead", "tbody", "tr", "th", "td",
      "figure", "figcaption",
      "div", "section", "article",
      // Inline
      "strong", "em", "b", "i", "u", "s", "small", "mark", "sub", "sup",
      "span",
      // Links & Media
      "a", "img",
    ],
    allowedAttributes: {
      "*": ["class", "id", "style"],
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
    },
    // Nur https und protokolllose URLs erlauben (kein javascript:, data:, vbscript:)
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
    // Style-Attribute restriktiv halten (kein expression(), kein javascript:)
    allowedStyles: {
      "*": {
        "text-align": [/^(left|right|center|justify)$/],
        color: [/^#(0x)?[0-9a-fA-F]+$/, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
        "background-color": [/^#(0x)?[0-9a-fA-F]+$/],
      },
    },
    // Externe Links automatisch hardenen.
    transformTags: {
      a: sanitizeHtmlLib.simpleTransform("a", { rel: "noopener noreferrer ugc", target: "_blank" }, true),
    },
    // Den YouTube-Marker passieren lassen (wird in BlogArticleBody verarbeitet).
    allowedSchemesAppliedToAttributes: ["href", "src", "cite"],
  }).trim();
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
