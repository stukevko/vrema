import Script from "next/script";

/**
 *  Plausible-Analytics (Cookie-frei, DSGVO-konform).
 *  Aktiv nur in Production UND wenn `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` gesetzt ist.
 *
 *  Vorteil ggü. GA: keine Banner-Pflicht, kein User-Tracking, kein Datenexport in die USA.
 */
export function PlausibleAnalytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;
  if (process.env.NODE_ENV !== "production") return null;
  return (
    <Script
      defer
      data-domain={domain}
      src="https://plausible.io/js/script.js"
      strategy="afterInteractive"
    />
  );
}
