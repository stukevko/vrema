export type TrialReminderKind = "3d" | "1d" | "expired";

export type TrialReminderCompany = {
  id: string;
  name: string;
  referredBy: string | null;
  trialRemind3dSentAt: Date | null;
  trialRemind1dSentAt: Date | null;
  trialExpiredNotifiedAt: Date | null;
};

/** Manuelle Abrechnung — Trial-Erinnerungen deaktiviert. */
export function pendingTrialReminder(_company: TrialReminderCompany): TrialReminderKind | null {
  return null;
}

export function trialInAppNotification(kind: TrialReminderKind, daysRemaining: number): {
  title: string;
  body: string;
  href: string;
} {
  switch (kind) {
    case "3d":
      return {
        title: "Noch 3 Tage Testphase",
        body: "Wir melden uns zur Freischaltung.",
        href: "/dashboard/access-pending",
      };
    case "1d":
      return {
        title: "Morgen endet die Testphase",
        body: "Kurz schreiben — wir schalten frei.",
        href: "/dashboard/access-pending",
      };
    case "expired":
      return {
        title: "Zugang wartet auf Freischaltung",
        body: "Kontakt aufnehmen — wir helfen sofort.",
        href: "/dashboard/access-pending",
      };
    default:
      return {
        title: `Noch ${daysRemaining} Tage`,
        body: "Freischaltung läuft.",
        href: "/dashboard/access-pending",
      };
  }
}

export function trialReminderSubject(kind: TrialReminderKind, companyName: string): string {
  switch (kind) {
    case "3d":
      return `VREMA: Freischaltung — ${companyName}`;
    case "1d":
      return `VREMA: Freischaltung — ${companyName}`;
    case "expired":
      return `VREMA: Zugang — ${companyName}`;
  }
  return `VREMA: ${companyName}`;
}
