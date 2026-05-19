import type { UnfilledSlot } from "@/lib/planning/autopilot";

export type AutopilotUserReport = {
  headline: string;
  hint?: string;
  /** Max. ein paar konkrete Slots — kein Roman. */
  openSlots?: string[];
};

const DAY_ORDER = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function sortDayLabels(labels: string[]) {
  return [...labels].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
}

/**
 * Menschliche Zusammenfassung statt 15× „Offen: … Kein verfügbarer Mitarbeitender…“
 */
export function formatAutopilotUserReport(params: {
  shiftsCreated: number;
  unfilled: UnfilledSlot[];
  teamPoolSize: number;
}): AutopilotUserReport {
  const { shiftsCreated, unfilled, teamPoolSize } = params;
  const open = unfilled.length;

  if (teamPoolSize === 0) {
    return {
      headline: "Keine planbaren Mitarbeitenden im Team.",
      hint: "Lade unter Team mindestens eine Person mit Rolle Mitarbeiter oder Manager ein — der Inhaber zählt nicht als Schichtpersonal.",
    };
  }

  if (shiftsCreated === 0 && open === 0) {
    return {
      headline: "Für diese Woche sind die gewählten Zeiten schon belegt.",
      hint: "Passe Zeiten an oder wähle eine andere Planwoche.",
    };
  }

  const headline =
    shiftsCreated > 0
      ? `${shiftsCreated} Schicht${shiftsCreated === 1 ? "" : "en"} als Entwurf vorgeschlagen${
          open > 0 ? ` · ${open} Slot${open === 1 ? "" : "s"} nicht besetzbar` : ""
        }.`
      : `Keine Schicht konnte vorgeschlagen werden (${open} offene Slots).`;

  let hint: string | undefined;
  if (teamPoolSize <= 2 && open > 0) {
    hint =
      "Mit wenig Personal rechnet der Autopilot nur eine Schicht pro Tag. Für Früh- und Spätdienst: Team vergrößern oder Schichten im Einfach-Planer manuell setzen.";
  } else if (open > 0) {
    hint = "Prüfe Abwesenheiten, Ruhezeiten und Überschneidungen — oder trage offene Slots manuell ein.";
  } else if (shiftsCreated > 0) {
    hint = "Gestrichelte Balken im Planer prüfen, dann veröffentlichen.";
  }

  const uniqueSlots =
    open > 0
      ? sortDayLabels(
          [...new Set(unfilled.map((u) => `${u.dayLabel} ${u.startTime.slice(0, 5)}–${u.endTime.slice(0, 5)}`))],
        )
      : [];
  const openSlots = uniqueSlots.length > 0 ? uniqueSlots.slice(0, 5) : undefined;
  if (uniqueSlots.length > 5) {
    hint = [hint, `${uniqueSlots.length - 5} weitere Zeiten offen.`].filter(Boolean).join(" ");
  }

  return { headline, hint, openSlots };
}
