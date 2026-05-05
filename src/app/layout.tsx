import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Relative Metadata-URLs (Icons, OG) werden hiermit aufgelöst — lokal sonst fälschlich Produktions-Host. */
function resolveMetadataBase(): URL {
  if (process.env.NEXT_PUBLIC_APP_URL) return new URL(process.env.NEXT_PUBLIC_APP_URL);
  if (process.env.VERCEL_URL) return new URL(`https://${process.env.VERCEL_URL}`);
  if (process.env.NODE_ENV === "development") return new URL("http://localhost:3000");
  return new URL("https://vrema.app");
}

export const metadata: Metadata = {
  title: {
    default: "VREMA - Intelligente Zeiterfassung",
    template: "%s | VREMA - Intelligente Zeiterfassung",
  },
  description:
    "VREMA: Intelligente Zeiterfassung mit Stempeluhr, Pausen, Berichten und DATEV-Export – Privacy by Design, 100 % DSGVO-konform ohne Standort-Tracking.",
  keywords: [
    "Zeiterfassung",
    "Digitale Zeiterfassung",
    "Zeiterfassung App",
    "Stempeluhr",
    "Arbeitszeiterfassung",
    "Mitarbeiter Zeiterfassung",
    "Privacy by Design",
    "DSGVO Zeiterfassung",
    "Ohne GPS Tracking",
    "DATEV Export",
    "Vrema",
    "VREMA",
    "KevkoStudio",
  ],
  metadataBase: resolveMetadataBase(),
  themeColor: "#ffffff",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VREMA",
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
    title: "VREMA - Intelligente Zeiterfassung",
    description:
      "Intelligente Zeiterfassung mit Stempeluhr, Berichten und DATEV-Export. Privacy by Design – ohne Standort-Tracking.",
    url: "https://vrema.app",
    siteName: "VREMA",
    locale: "de_DE",
    type: "website",
    images: [{ url: "/vrema_logo.png", alt: "VREMA - Intelligente Zeiterfassung" }],
  },
  twitter: {
    card: "summary",
    title: "VREMA - Intelligente Zeiterfassung",
    description: "Intelligente Zeiterfassung für Teams und Unternehmen.",
  },
  icons: {
    icon: [
      { url: "/favicon-48x48.png", type: "image/png", sizes: "48x48" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon.ico", type: "image/x-icon", sizes: "any" },
    ],
    shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="min-h-0 w-full overflow-x-hidden">
      <head>
        {/* Statische Assets aus /public — gleiche URLs wie PWA-Manifest */}
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-[100dvh] w-full min-w-0 antialiased bg-background text-foreground`}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
