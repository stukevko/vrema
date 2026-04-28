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
    default: "Vrema | Digitale Zeiterfassung von KevkoStudio",
    template: "%s | Vrema by KevkoStudio",
  },
  description:
    "Vrema ist die digitale Zeiterfassung von KevkoStudio: Stempeluhr, Pausen, GPS-Zeiterfassung, Berichte und DATEV-freundlicher Export in einer Cloud.",
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
    title: "Vrema | Zeiterfassung von KevkoStudio",
    description:
      "Digitale Zeiterfassung mit Stempeluhr, GPS, Berichten und Export. Ein Produkt von KevkoStudio.",
    url: "https://vrema.app",
    siteName: "Vrema by KevkoStudio",
    locale: "de_DE",
    type: "website",
    images: [
      {
        url: "/api/assets/logo",
        width: 512,
        height: 512,
        alt: "Vrema by KevkoStudio",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Vrema | Digitale Zeiterfassung",
    description: "Digitale Zeiterfassung von KevkoStudio",
  },
  icons: {
    icon: [
      { url: "/api/assets/favicon", type: "image/x-icon" },
      { url: "/api/assets/logo", type: "image/png" },
    ],
    shortcut: [{ url: "/api/assets/favicon", type: "image/x-icon" }],
    apple: [{ url: "/api/assets/logo", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0b0b0b] text-white`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
