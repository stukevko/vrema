import type { CompanyIndustry } from "@prisma/client";

/** Optionale Erweiterungen — Kern ist immer Stempeln, Plan, Abwesenheit, Berichte. */
export type CompanyModuleKey =
  | "peaks"
  | "plannerWeather"
  | "shiftTrade"
  | "shiftTasks"
  | "autopilot";

export type CompanyModules = Record<CompanyModuleKey, boolean>;

export const COMPANY_MODULE_LABELS: Record<
  CompanyModuleKey,
  { title: string; description: string }
> = {
  peaks: {
    title: "Stoßzeiten & Umsatz",
    description: "Auslastungsprofil, Umsatz-Signale und Personal-Tipps für stark schwankende Betriebe.",
  },
  plannerWeather: {
    title: "Wetter im Planer",
    description: "Tageswetter in der Schichtplanung — sinnvoll bei Außenbereich oder wetterabhängigem Betrieb.",
  },
  shiftTrade: {
    title: "Schicht-Tausch",
    description: "Kolleg:innen bieten Schichten an und tauschen mit Freigabe durch die Leitung.",
  },
  shiftTasks: {
    title: "Schicht-Checklisten",
    description: "Aufgabenlisten pro Schicht (Öffnen, Reinigung, Kassenabschluss …).",
  },
  autopilot: {
    title: "Planungs-Autopilot (Beta)",
    description: "KI-Vorschläge zum Befüllen des Wochenplans — immer mit Prüfung vor Veröffentlichung.",
  },
};

const GASTRO_INDUSTRIES: CompanyIndustry[] = [
  "RESTAURANT",
  "CAFE",
  "BAR",
  "HOTEL",
  "BAKERY",
  "CANTEEN",
  "CLUB",
  "CATERING",
];

const WEATHER_INDUSTRIES: CompanyIndustry[] = [
  ...GASTRO_INDUSTRIES,
];

export function industryModuleDefaults(
  industry: CompanyIndustry | null | undefined,
): CompanyModules {
  const isGastro = industry != null && GASTRO_INDUSTRIES.includes(industry);
  const weather = industry != null && WEATHER_INDUSTRIES.includes(industry);
  return {
    peaks: isGastro,
    plannerWeather: weather,
    shiftTrade: true,
    shiftTasks: false,
    autopilot: false,
  };
}

export type CompanyModuleRow = {
  industry: CompanyIndustry | null;
  modulePeaks: boolean;
  modulePlannerWeather: boolean;
  moduleShiftTrade: boolean;
  moduleShiftTasks: boolean;
  moduleAutopilot: boolean;
};

export function companyModulesFromRow(row: CompanyModuleRow): CompanyModules {
  return {
    peaks: row.modulePeaks,
    plannerWeather: row.modulePlannerWeather,
    shiftTrade: row.moduleShiftTrade,
    shiftTasks: row.moduleShiftTasks,
    autopilot: row.moduleAutopilot,
  };
}

export function hasCompanyModule(modules: CompanyModules, key: CompanyModuleKey): boolean {
  return modules[key];
}
