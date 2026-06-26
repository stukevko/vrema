import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { SoftwareApplicationJsonLd } from "@/components/seo/SoftwareApplicationJsonLd";
import { PlausibleAnalytics } from "@/components/analytics/PlausibleStub";
import { getSiteUrl, resolveMetadataBase, SEO_KEYWORDS } from "@/lib/seo/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_TITLE = "VREMA – Schichtplanung & Zeiterfassung für Teams";
const SITE_DESCRIPTION =
  "VREMA: Schichtplanung, Zeiterfassung und Stempeluhr mit Live-Reports und DATEV-Export. Privacy by Design, DSGVO-konform ohne Standort-Tracking – in Hell- und Dunkelmodus nutzbar.";

export async function generateMetadata(): Promise<Metadata> {
  const metadataBase = resolveMetadataBase();
  const site = getSiteUrl();

  return {
    title: {
      default: SITE_TITLE,
      template: "%s | VREMA – Schichtplanung & Zeiterfassung",
    },
    description: SITE_DESCRIPTION,
    keywords: [
      ...SEO_KEYWORDS,
      "Zeiterfassung Handwerk",
      "Schichtplanung Pflege",
      "Schichtplanung Teams",
      "Schichtplanung Software",
      "DATEV Export",
      "Privacy by Design",
      "KevkoStudio",
    ],
    metadataBase,
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "VREMA – Schichtplanung",
    },
    applicationName: "VREMA",
    formatDetection: {
      telephone: false,
    },
    alternates: {
      canonical: "/",
    },
    manifest: "/site.webmanifest",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      title: "VREMA – Schichtplanung & Zeiterfassung",
      description: SITE_DESCRIPTION,
      url: site,
      siteName: "VREMA",
      locale: "de_DE",
      type: "website",
      images: [
        {
          url: "/android-chrome-512x512.png",
          alt: "VREMA Logo – Schichtplanung und Zeiterfassung für Teams",
        },
      ],
    },
    twitter: {
      card: "summary",
      title: "VREMA – Schichtplanung & Zeiterfassung",
      description:
        "Schichtplanung und Zeiterfassung für Teams: DSGVO-konform, ohne GPS-Tracking, mit DATEV-freundlichen Exporten.",
    },
    icons: {
      icon: [
        { url: "/brand-tile.svg", type: "image/svg+xml" },
        { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
        { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
        { url: "/favicon.ico", type: "image/x-icon", sizes: "any" },
      ],
      shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
      apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
    },
    other: {
      "color-scheme": "light dark",
    },
  };
}

export const viewport: Viewport = {
  // Light/Dark stimmen mit dem Manifest-Theme (Petrol) und dem App-Header ab,
  // damit iOS-Statusbar und PWA-Splash konsistent wirken.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a3a52" },
    { media: "(prefers-color-scheme: dark)", color: "#0a3a52" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="min-h-0 w-full overflow-x-hidden" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <ThemeScript />
        <link rel="icon" type="image/svg+xml" href="/brand-tile.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        {/* Manifest wird über `metadata.manifest` (→ /site.webmanifest) injected; doppelte Referenz entfernt. */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="VREMA" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="msapplication-TileColor" content="#0a3a52" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-[100dvh] w-full min-w-0 antialiased bg-background text-fg`}
      >
        <SoftwareApplicationJsonLd />
        <PlausibleAnalytics />
        <SessionProvider>{children}</SessionProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
