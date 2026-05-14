import { getSiteUrl } from "@/lib/seo/site";

/**
 * Globales Schema.org JSON-LD: SoftwareApplication (BusinessApplication)
 * + Organization + WebSite. Einmal im Root-Layout einbinden.
 */
export function SoftwareApplicationJsonLd() {
  const appUrl = getSiteUrl();

  const graph = [
    {
      "@type": "Organization",
      "@id": `${appUrl}/#organization`,
      name: "KevkoStudio",
      url: appUrl,
      email: "kontakt@kevko.studio",
      brand: {
        "@type": "Brand",
        name: "VREMA",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${appUrl}/#website`,
      url: appUrl,
      name: "VREMA – Schichtplanung & Zeiterfassung",
      inLanguage: "de-DE",
      publisher: { "@id": `${appUrl}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${appUrl}/#software`,
      name: "VREMA",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "WorkforceManagement",
      operatingSystem: "Web",
      description:
        "VREMA: Schichtplanung, Zeiterfassung und Stempeluhr für Teams. Privacy by Design, DSGVO-konform, DATEV-freundlich – ohne Standort-Tracking.",
      url: appUrl,
      keywords: "Schichtplanung, Zeiterfassung, Stempeluhr, Teams, DSGVO, DATEV",
      audience: {
        "@type": "BusinessAudience",
        audienceType: "Betriebe und Teams",
      },
      knowsAbout: [
        "Schichtplanung",
        "Zeiterfassung",
        "Stempeluhr",
        "DSGVO",
      ],
      brand: {
        "@type": "Brand",
        name: "VREMA",
      },
      provider: { "@id": `${appUrl}/#organization` },
    },
  ];

  const payload = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
