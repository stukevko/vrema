import Stripe from "stripe";
import { env } from "@/lib/env";

// Production-Pflicht wird zentral in `@/lib/env` erzwungen (Boot-Fail-Fast).
// In Development/Test darf ein Test-Dummy laufen, damit lokale Pre-Auth-Flows
// (Onboarding-Skip) ohne Stripe getestet werden können.
const stripeSecret = env.STRIPE_SECRET_KEY.trim() || "sk_test_dummy";

export const stripe = new Stripe(stripeSecret, {
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
});

export const PLANS = {
  STARTER: {
    name: "Starter",
    monthlyPrice: 29,
    yearlyPrice: 24, // ~2 months free
    priceIds: {
      monthly: env.STRIPE_STARTER_MONTHLY ?? "",
      yearly: env.STRIPE_STARTER_YEARLY ?? "",
    },
    limits: {
      employees: 10,
      pdfExport: false,
      payrollEmail: false,
      qrTerminal: false,
    },
    features: [
      "Bis zu 10 Mitarbeiter",
      "Live-Terminal Check-in/out",
      "Saldo-Übersicht (Über-/Minderstunden)",
      "Urlaubsanträge",
      "Privacy by Design (ohne Standort-Tracking)",
      "E-Mail-Support",
    ],
  },
  BUSINESS: {
    name: "Business",
    monthlyPrice: 79,
    yearlyPrice: 66,
    priceIds: {
      monthly: env.STRIPE_BUSINESS_MONTHLY ?? "",
      yearly: env.STRIPE_BUSINESS_YEARLY ?? "",
    },
    limits: {
      employees: 100,
      pdfExport: true,
      payrollEmail: true,
      qrTerminal: true,
    },
    features: [
      "Bis zu 100 Mitarbeiter",
      "Alles aus Starter",
      "PDF-Export (Monatsberichte)",
      "E-Mail an Lohnbüro",
      "Privacy by Design (ohne Standort-Tracking)",
      "Prioritäts-Support",
    ],
  },
  ENTERPRISE: {
    name: "Enterprise",
    monthlyPrice: null,
    yearlyPrice: null,
    priceIds: {
      monthly: env.STRIPE_ENTERPRISE_MONTHLY ?? "",
      yearly: env.STRIPE_ENTERPRISE_YEARLY ?? "",
    },
    limits: {
      employees: Infinity,
      pdfExport: true,
      payrollEmail: true,
      qrTerminal: true,
    },
    features: [
      "Unbegrenzte Mitarbeiter",
      "Alles aus Business",
      "Custom Branding",
      "API-Zugang",
      "Privacy by Design (ohne Standort-Tracking)",
      "Dedizierter Account Manager",
      "SLA-Garantie",
    ],
  },
} as const;
