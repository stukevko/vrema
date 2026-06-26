/** Zentrale Pfade zu den Marken-Assets in `/public`. */
export const VREMA_BRAND = {
  /** Horizontales Logo — nur OG/Social (PNG vom User oft zu dunkel; UI nutzt SVG-Lockup). */
  logo: "/vrema_logo.png",
  /** Master-SVG für Favicon-Generierung (Petrol + weißes V). */
  tileSvg: "/brand-tile.svg",
  faviconIco: "/favicon.ico",
  faviconPng: "/favicon.png",
  favicon32: "/favicon-32x32.png",
  favicon16: "/favicon-16x16.png",
  appleTouchIcon: "/apple-touch-icon.png",
  androidChrome192: "/android-chrome-192x192.png",
  androidChrome512: "/android-chrome-512x512.png",
  logoAspect: 1408 / 768,
} as const;
