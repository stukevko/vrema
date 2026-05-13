import type { NextConfig } from "next";

// Produktiv erlaubte Origins für Server-Actions:
// In Production *muss* die Live-Domain explizit erlaubt sein, sonst werden
// Server-Actions vom Browser mit 403 (Same-Origin-Mismatch) blockiert.
// Wir akzeptieren die kanonische Domain UND die `www.`-Variante, damit beide
// Aufrufpfade über das gleiche Deployment funktionieren.
const productionAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
const productionHosts: string[] = (() => {
  if (!productionAppUrl) return [];
  try {
    const host = new URL(productionAppUrl).host;
    const stripped = host.replace(/^www\./i, "");
    return Array.from(new Set([host, stripped, `www.${stripped}`]));
  } catch {
    return [];
  }
})();

const additionalHosts =
  process.env.NEXT_PUBLIC_ADDITIONAL_ALLOWED_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

const allowedServerActionOrigins = Array.from(
  new Set([
    "localhost:3000",
    "127.0.0.1:3000",
    ...productionHosts,
    ...additionalHosts,
  ]),
);

const nextConfig: NextConfig = {
  // Sicherheits-Best-Practice: kein "X-Powered-By: Next.js"-Leak.
  poweredByHeader: false,
  // Aktiviert gzip/brotli (default true – explizit für Klarheit).
  compress: true,
  reactStrictMode: true,

  experimental: {
    serverActions: {
      allowedOrigins: allowedServerActionOrigins,
    },
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "openweathermap.org" },
    ],
  },

  // Globale Security-Header für alle Routen (inkl. statisch generierte).
  async headers() {
    const securityHeaders = [
      // HTTP Strict Transport Security – erzwingt HTTPS, 1 Jahr, inkl. Subdomains.
      // Achtung: nur aktivieren, wenn die Produktivdomain dauerhaft mit HTTPS läuft.
      {
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      },
      // Verhindert MIME-Type-Sniffing.
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Clickjacking-Schutz; SAMEORIGIN erlaubt eigene iframes (Stripe-Checkout etc. öffnet eigene Popups, kein iframe-Wrap).
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      // Referrer-Sparsamkeit – kein Cross-Origin-Leak des Full-Paths.
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // VREMA nutzt KEIN Geo/Camera/Microphone – explizit deaktivieren.
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      },
      // DNS-Prefetch erlauben (Performance), default schon, explizit für Konsistenz.
      { key: "X-DNS-Prefetch-Control", value: "on" },
    ];

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
