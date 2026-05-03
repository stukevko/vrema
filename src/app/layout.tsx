import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { SessionProvider } from "next-auth/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "VREMA - Intelligente Zeiterfassung",
    template: "%s | VREMA - Intelligente Zeiterfassung",
  },
  description:
    "VREMA: Intelligente Zeiterfassung mit Stempeluhr, Pausen, GPS-Validierung, Berichten und DATEV-freundlichem Export in der Cloud.",
  keywords: [
    "Zeiterfassung",
    "Digitale Zeiterfassung",
    "Zeiterfassung App",
    "Stempeluhr",
    "Arbeitszeiterfassung",
    "Mitarbeiter Zeiterfassung",
    "GPS Zeiterfassung",
    "DATEV Export",
    "Vrema",
    "VREMA",
    "KevkoStudio",
  ],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://vrema.app"),
  alternates: {
    canonical: "/",
  },
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
      "Intelligente Zeiterfassung mit Stempeluhr, GPS-Validierung, Berichten und DATEV-freundlichem Export.",
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
    icon: [{ url: "/favicon.ico", type: "image/x-icon", sizes: "any" }],
    shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
    apple: [{ url: "/vrema_logo_icon.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
