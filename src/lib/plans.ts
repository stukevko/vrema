/** All-In Tarife — Abrechnung manuell per Rechnung/Überweisung. */
const ALL_IN_FEATURE_BULLETS = [
  "Stempeln & Live-Terminal",
  "Schichtplan, Team & Abwesenheit",
  "Schicht-Tausch",
  "PDF-Export & DATEV-CSV",
  "E-Mail ans Lohnbüro",
  "QR-Terminal",
] as const;

export const PLANS = {
  PETITE: {
    name: "Petite",
    monthlyPrice: 29,
    yearlyPrice: 24,
    limits: {
      employees: 50,
      pdfExport: true,
      payrollEmail: true,
      qrTerminal: true,
    },
    features: [
      "Bis zu 50 Mitarbeitende",
      ...ALL_IN_FEATURE_BULLETS,
      "E-Mail-Support",
    ],
  },
  MAJOR: {
    name: "Major",
    monthlyPrice: 90,
    yearlyPrice: 75,
    limits: {
      employees: Infinity,
      pdfExport: true,
      payrollEmail: true,
      qrTerminal: true,
    },
    features: [
      "Unbegrenzte Mitarbeitende (ab 51 MA)",
      ...ALL_IN_FEATURE_BULLETS,
      "Prioritäts-Support",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;

/** Bankverbindung für manuelle Rechnungen — in UI anzeigen. */
export const MANUAL_BILLING = {
  contactEmail: "kontakt@kevko.studio",
  paymentNote:
    "Rechnung per E-Mail nach Freischaltung. Zahlung per Überweisung — Zugang bleibt aktiv, solange die Rechnung beglichen ist.",
} as const;
