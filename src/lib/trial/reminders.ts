import {
  isBillingExempt,
  isInAppTrial,
  isTrialExpired,
  trialDaysRemaining,
  type CompanyTrialFields,
} from "@/lib/trial/state";

export type TrialReminderKind = "3d" | "1d" | "expired";

export type TrialReminderCompany = CompanyTrialFields & {
  id: string;
  name: string;
  referredBy: string | null;
  trialRemind3dSentAt: Date | null;
  trialRemind1dSentAt: Date | null;
  trialExpiredNotifiedAt: Date | null;
};

/** Firma braucht aktuell eine Trial-Erinnerung? (reine Logik, testbar). */
export function pendingTrialReminder(company: TrialReminderCompany): TrialReminderKind | null {
  if (isBillingExempt(company)) return null;
  if (company.tenantStatus === "ACTIVE") return null;
  if (!company.trialEndsAt) return null;

  const days = trialDaysRemaining(company);

  if (isTrialExpired(company)) {
    if (company.trialExpiredNotifiedAt) return null;
    const msSinceEnd = Date.now() - company.trialEndsAt.getTime();
    if (msSinceEnd > 3 * 24 * 60 * 60 * 1000) return null;
    return "expired";
  }

  if (!isInAppTrial(company)) return null;

  if (days <= 3 && days >= 2 && !company.trialRemind3dSentAt) return "3d";
  if (days <= 1 && days >= 1 && !company.trialRemind1dSentAt) return "1d";

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
        body: "Kurz Zugang anfragen — wir schalten frei.",
        href: "/dashboard/billing",
      };
    case "1d":
      return {
        title: "Morgen endet die Testphase",
        body: "Jetzt Zugang anfragen — persönliche Freischaltung.",
        href: "/dashboard/billing",
      };
    case "expired":
      return {
        title: "Testphase vorbei",
        body: "Zugang anfragen — wir schalten sofort frei.",
        href: "/dashboard/trial-ended",
      };
    default:
      return {
        title: `Noch ${daysRemaining} Tage Testphase`,
        body: "Rechtzeitig Zugang anfragen.",
        href: "/dashboard/billing",
      };
  }
}

export function trialReminderSubject(kind: TrialReminderKind, companyName: string): string {
  switch (kind) {
    case "3d":
      return `VREMA: Noch 3 Tage — ${companyName}`;
    case "1d":
      return `VREMA: Letzter Tag — ${companyName}`;
    case "expired":
      return `VREMA: Testphase beendet — ${companyName}`;
  }
  return `VREMA: ${companyName}`;
}
