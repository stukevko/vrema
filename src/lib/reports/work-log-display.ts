/** Lesbare Status- und Bemerkungstexte für Berichte, PDF, CSV (keine Technik-Codes). */

export type WorkLogStatus = "ON_TIME" | "LATE" | "ABSENT" | "MANUAL_ADJUSTED";

export function workLogStatusLabel(status: WorkLogStatus): string {
  switch (status) {
    case "ON_TIME":
      return "Pünktlich";
    case "LATE":
      return "Zu spät";
    case "ABSENT":
      return "Nicht erschienen";
    case "MANUAL_ADJUSTED":
      return "Manuell korrigiert";
    default:
      return "Erfasst";
  }
}

/** PDF/Druck: nur ASCII — jsPDF zerstört Unicode-Symbole (z. B. ● → %Ï). */
export function workLogStatusPrintLabel(status: WorkLogStatus): string {
  return workLogStatusLabel(status);
}

const NOTE_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  {
    pattern: /\[EXTRA[-_]SCHICHT\][^\n|]*/gi,
    replacement: "Nicht nach Zeitplan eingestempelt",
  },
  {
    pattern: /\[EXTRA_SHIFT\][^\n|]*/gi,
    replacement: "Nicht nach Zeitplan eingestempelt",
  },
  {
    pattern: /\[AUTO[-_]ABWESEND\][^\n|]*/gi,
    replacement: "Automatisch als fehlend erfasst",
  },
  {
    pattern: /\[MANUELLE[-_]KORREKTUR\]/gi,
    replacement: "",
  },
  {
    pattern: /\[MANAGER[-_]BEARBEITUNG:\s*([^\]]+)\]/gi,
    replacement: "Korrektur durch Chef: $1",
  },
  {
    pattern: /\[MANAGER[-_]EDIT:\s*([^\]]+)\]/gi,
    replacement: "Korrektur durch Chef: $1",
  },
  {
    pattern: /\[REQUEST_APPROVED:[^\]]+\]/gi,
    replacement: "",
  },
  {
    pattern: /\[REQUEST_REJECTED:[^\]]+\]/gi,
    replacement: "",
  },
];

/**
 * Wandelt gespeicherte System-Notizen in kurze, lohnbüro-taugliche Sätze um.
 * Legacy-Einträge mit [TAGS] bleiben lesbar.
 */
export function humanizeWorkLogNote(note: string | null | undefined): string {
  if (!note?.trim()) return "—";

  let text = note.trim();
  for (const { pattern, replacement } of NOTE_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  const parts = text
    .split("|")
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0 && !/^[\[\]]+$/.test(p));

  if (parts.length === 0) return "—";
  return parts.join(" · ");
}
