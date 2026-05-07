export type WageTypeCode = "001" | "002";

export type DatevExportConfig = {
  beraterNummer?: string;
  mandantenNummer?: string;
  abrechnungsMonat: string; // Beispiel: 2026-04
  währung?: string; // Standard: EUR
};

export type DatevExportRow = {
  beraterNummer: string;
  mandantenNummer: string;
  abrechnungsMonat: string;
  lohnart: WageTypeCode;
  lohnartText: string;
  mitarbeiterNummer: string;
  mitarbeiterName: string;
  datum: string; // Beispiel: 29.04.2026
  pauseMinuten: number;
  nettoMinuten: number;
  stundenDezimal: string; // Deutsches Format, Beispiel: 1,50
  notiz?: string;
};

