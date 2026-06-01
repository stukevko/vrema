import { describe, expect, it } from "vitest";
import {
  DEFAULT_VOCABULARY,
  VOCABULARY_OPTIONS,
  defaultVocabularyForIndustry,
  normalizeVocabulary,
  vocabularyLabels,
} from "@/lib/vocabulary";

describe("normalizeVocabulary", () => {
  it("akzeptiert gültige Werte", () => {
    expect(normalizeVocabulary("SHIFT")).toBe("SHIFT");
    expect(normalizeVocabulary("ASSIGNMENT")).toBe("ASSIGNMENT");
    expect(normalizeVocabulary("DUTY")).toBe("DUTY");
  });

  it("fällt bei ungültigen Werten auf den Default zurück", () => {
    expect(normalizeVocabulary(null)).toBe(DEFAULT_VOCABULARY);
    expect(normalizeVocabulary(undefined)).toBe(DEFAULT_VOCABULARY);
    expect(normalizeVocabulary("")).toBe(DEFAULT_VOCABULARY);
    expect(normalizeVocabulary("shift")).toBe(DEFAULT_VOCABULARY); // case-sensitiv
    expect(normalizeVocabulary("BANANE")).toBe(DEFAULT_VOCABULARY);
  });
});

describe("vocabularyLabels", () => {
  it("liefert die korrekten Labels je Vokabular", () => {
    expect(vocabularyLabels("SHIFT").planTitle).toBe("Schichtplan");
    expect(vocabularyLabels("ASSIGNMENT").singular).toBe("Einsatz");
    expect(vocabularyLabels("ASSIGNMENT").plural).toBe("Einsätze");
    expect(vocabularyLabels("DUTY").planTitle).toBe("Dienstplan");
  });

  it("nutzt bei ungültigem Wert den Default (Schicht)", () => {
    expect(vocabularyLabels("xxx").singular).toBe("Schicht");
  });
});

describe("defaultVocabularyForIndustry", () => {
  it("mappt Handwerk/Außendienst auf Einsatz", () => {
    expect(defaultVocabularyForIndustry("CRAFT")).toBe("ASSIGNMENT");
    expect(defaultVocabularyForIndustry("field_service")).toBe("ASSIGNMENT");
  });

  it("mappt Pflege/Sicherheit auf Dienst", () => {
    expect(defaultVocabularyForIndustry("CARE")).toBe("DUTY");
    expect(defaultVocabularyForIndustry("security")).toBe("DUTY");
  });

  it("Gastro/Handel/Unbekannt → Schicht", () => {
    expect(defaultVocabularyForIndustry("RESTAURANT")).toBe("SHIFT");
    expect(defaultVocabularyForIndustry(null)).toBe("SHIFT");
    expect(defaultVocabularyForIndustry("OTHER")).toBe("SHIFT");
  });
});

describe("VOCABULARY_OPTIONS", () => {
  it("enthält genau die drei Vokabulare", () => {
    expect(VOCABULARY_OPTIONS.map((o) => o.value)).toEqual(["SHIFT", "ASSIGNMENT", "DUTY"]);
  });
});
