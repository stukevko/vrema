"use client";

import { createContext, useContext } from "react";
import { vocabularyLabels, type VocabularyLabels } from "@/lib/vocabulary";

const VocabularyContext = createContext<VocabularyLabels>(vocabularyLabels("SHIFT"));

export function VocabularyProvider({
  labels,
  children,
}: {
  labels: VocabularyLabels;
  children: React.ReactNode;
}) {
  return <VocabularyContext.Provider value={labels}>{children}</VocabularyContext.Provider>;
}

export function useVocabulary(): VocabularyLabels {
  return useContext(VocabularyContext);
}
