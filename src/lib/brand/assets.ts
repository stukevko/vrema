/** Zentrale Pfade zu den Marken-Assets in `/public`. */
export const VREMA_BRAND = {
  /** Horizontales Logo (Lockup) — Login, Marketing, OG. */
  logo: "/vrema_logo.png",
  /** Quadratisches App-Icon (192×192) — UI-Mark, PWA. */
  icon: "/android-chrome-192x192.png",
  faviconIco: "/favicon.ico",
  faviconPng: "/favicon.png",
  favicon32: "/favicon-32x32.png",
  favicon16: "/favicon-16x16.png",
  appleTouchIcon: "/apple-touch-icon.png",
  androidChrome192: "/android-chrome-192x192.png",
  androidChrome512: "/android-chrome-512x512.png",
  /** Breite : Höhe des Lockups (1408×768). */
  logoAspect: 1408 / 768,
} as const;
