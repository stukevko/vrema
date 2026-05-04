import type { Metadata } from "next";
import { MarketingSiteChrome } from "@/components/marketing/MarketingSiteChrome";

export const metadata: Metadata = {
  title: {
    default: "VREMA Insights",
    template: "%s | VREMA Insights",
  },
  description: "Product Journal von VREMA: Produkt-Updates, Tutorials und Wissen rund um Zeiterfassung & Compliance.",
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <MarketingSiteChrome>{children}</MarketingSiteChrome>;
}
