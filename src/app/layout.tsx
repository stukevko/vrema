import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { SoftwareApplicationJsonLd } from "@/components/seo/SoftwareApplicationJsonLd";
import { getSiteUrl, resolveMetadataBase, SEO_KEYWORDS } from "@/lib/seo/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_TITLE =
  "VREMA – Die intelligente Gastro-Planung & Zeiterfassung für Restaurants und Teams";
const SITE_DESCRIPTION =
  "VREMA: Gastro-Planung, Schichtplanung und digitale Zeiterfassung mit Stempeluhr, Live-Reports und DATEV-Export. Privacy by Design, 100 % DSGVO-konform ohne Standort-Tracking – in Hell- und Dunkelmodus nutzbar.";

export async function generateMetadata(): Promise<Metadata> {
  const metadataBase = resolveMetadataBase();
  const site = getSiteUrl();

  return {
    title: {
      default: SITE_TITLE,
      template: "%s | VREMA – Gastro-Planung & Zeiterfassung",
    },
    description: SITE_DESCRIPTION,
    keywords: [
      ...SEO_KEYWORDS,
      "Restaurant Zeiterfassung",
      "Hotellerie",
      "Schichtplanung Software",
      "DATEV Export",
      "Privacy by Design",
      "KevkoStudio",
    ],
    metadataBase,
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "VREMA – Gastro-Planung",
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
      title: "VREMA – Die intelligente Gastro-Planung",
      description: SITE_DESCRIPTION,
      url: site,
      siteName: "VREMA",
      locale: "de_DE",
      type: "website",
      images: [
        {
          url: "/vrema_logo.png",
          alt: "VREMA Logo – Gastro-Planung, Schichtplanung und Zeiterfassung für die Gastronomie",
        },
      ],
    },
    twitter: {
      card: "summary",
      title: "VREMA – Die intelligente Gastro-Planung",
      description:
        "Schichtplanung und Zeiterfassung für Restaurants: DSGVO-konform, ohne GPS-Tracking, mit DATEV-freundlichen Exporten.",
    },
    icons: {
      icon: [
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#131418" },
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
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="VREMA – Gastro-Planung" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="msapplication-TileColor" content="#131418" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-[100dvh] w-full min-w-0 antialiased bg-background text-fg`}
      >
        <SoftwareApplicationJsonLd />
        <SessionProvider>{children}</SessionProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
