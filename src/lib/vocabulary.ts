/**
 * Branchen-neutrales Terminologie-Layer.
 *
 * VREMA ist branchenunabhängig (Handwerk, Handel, Pflege, Dienstleistung,
 * Gastro …). Intern heißt eine geplante Arbeitszeit technisch weiterhin
 * `Shift`, im UI nennt sie jede Firma aber so, wie ihr Team spricht:
 *   - SHIFT       → „Schicht"  (Gastro, Handel, Produktion)
 *   - ASSIGNMENT  → „Einsatz"  (Handwerk, Außendienst, Dienstleistung)
 *   - DUTY        → „Dienst"   (Pflege, Sicherheit, Rettung)
 *
 * Dieses Modul ist eine reine Library (keine DB/I/O) → überall nutzbar
 * (Server, Client, Push-Texte) und trivial testbar.
 */

export type ShiftVocabulary = "SHIFT" | "ASSIGNMENT" | "DUTY";

export const DEFAULT_VOCABULARY: ShiftVocabulary = "SHIFT";

export type VocabularyLabels = {
  /** Einzahl, z. B. „Schicht". */
  singular: string;
  /** Mehrzahl, z. B. „Schichten". */
  plural: string;
  /** Bezeichnung des Plans, z. B. „Schichtplan". */
  planTitle: string;
  /** Verb für „einer Person zuweisen", z. B. „einplanen" (branchenneutral). */
  verb: string;
};

const LABELS: Record<ShiftVocabulary, VocabularyLabels> = {
  SHIFT: {
    singular: "Schicht",
    plural: "Schichten",
    planTitle: "Schichtplan",
    verb: "einplanen",
  },
  ASSIGNMENT: {
    singular: "Einsatz",
    plural: "Einsätze",
    planTitle: "Einsatzplan",
    verb: "einplanen",
  },
  DUTY: {
    singular: "Dienst",
    plural: "Dienste",
    planTitle: "Dienstplan",
    verb: "einplanen",
  },
};

/** UI-Optionen für ein Auswahl-Dropdown (Reihenfolge = Anzeige-Reihenfolge). */
export const VOCABULARY_OPTIONS: ReadonlyArray<{
  value: ShiftVocabulary;
  label: string;
  hint: string;
}> = [
  { value: "SHIFT", label: "Schicht", hint: "Gastro, Handel, Produktion" },
  { value: "ASSIGNMENT", label: "Einsatz", hint: "Handwerk, Außendienst, Dienstleistung" },
  { value: "DUTY", label: "Dienst", hint: "Pflege, Sicherheit, Rettung" },
];

/** Normalisiert einen beliebigen Wert auf ein gültiges Vokabular. */
export function normalizeVocabulary(value: string | null | undefined): ShiftVocabulary {
  if (value === "ASSIGNMENT" || value === "DUTY" || value === "SHIFT") return value;
  return DEFAULT_VOCABULARY;
}

/** Liefert die Labels für ein (ggf. unsicheres) Vokabular. */
export function vocabularyLabels(value: string | null | undefined): VocabularyLabels {
  return LABELS[normalizeVocabulary(value)];
}

/** Default-Vokabular je Branche (für Onboarding/Industry-Presets). */
export function defaultVocabularyForIndustry(industry: string | null | undefined): ShiftVocabulary {
  switch ((industry ?? "").toUpperCase()) {
    case "CRAFT":
    case "HANDWERK":
    case "FIELD_SERVICE":
    case "LOGISTICS":
      return "ASSIGNMENT";
    case "CARE":
    case "HEALTHCARE":
    case "SECURITY":
      return "DUTY";
    default:
      // Gastro/Handel/Produktion und Unbekanntes → „Schicht".
      return "SHIFT";
  }
}
