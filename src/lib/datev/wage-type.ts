import type { WageTypeCode } from "@/lib/datev/types";

export type WageType = {
  code: WageTypeCode;
  text: string;
};

/**
 * Einfache, erweiterbare Zuordnung für DATEV-Lohnarten.
 * 001 = reguläre Arbeitszeit
 * 002 = Überstunden
 */
export function mapWageType(input: { isOvertime: boolean }): WageType {
  if (input.isOvertime) {
    return { code: "002", text: "Überstunden" };
  }
  return { code: "001", text: "Arbeitszeit" };
}

