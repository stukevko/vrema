"use client";

import Link from "next/link";
import { Clock, Sparkles } from "lucide-react";
import { TRIAL_MAX_EMPLOYEES } from "@/lib/trial/constants";
import { useUpgrade } from "@/components/dashboard/UpgradeContext";

function formatTrialEnd(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function TrialStatusBanner({
  daysRemaining,
  activeEmployees,
  flyerCampaignLabel,
  trialEndsAtIso,
  role = "EMPLOYEE",
}: {
  daysRemaining: number;
  activeEmployees: number;
  /** z. B. „Speyer Flyer-Aktion“ — 30-Tage-Kampagne statt Standard-7-Tage-Trial. */
  flyerCampaignLabel?: string | null;
  /** ISO-Ende der Testphase — für klare Deadline-Anzeige. */
  trialEndsAtIso?: string | null;
  role?: string;
}) {
  const { openUpgrade } = useUpgrade();
  const isManager =
    role === "COMPANY_OWNER" || role === "MANAGER" || role === "SUPER_ADMIN";
  const urgent = daysRemaining <= 1;
  const soonEnding = daysRemaining <= 3 && daysRemaining > 1;
  const endLabel = trialEndsAtIso ? formatTrialEnd(trialEndsAtIso) : null;

  return (
    <div
      className={`no-print mb-4 rounded-2xl border px-4 py-3 text-sm md:mb-5 ${
        urgent
          ? "border-amber-300/60 bg-amber-50/90 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100"
          : "border-brand/25 bg-brand-soft/80 text-foreground dark:border-white/10 dark:bg-brand/18"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {urgent ? (
            <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
          )}
          <div className="min-w-0">
            <p className="font-semibold">
              {flyerCampaignLabel
                ? urgent
                  ? `${flyerCampaignLabel}: noch ${daysRemaining} ${daysRemaining === 1 ? "Tag" : "Tage"}`
                  : `Aktions-Zugang (${flyerCampaignLabel}): noch ${daysRemaining} ${daysRemaining === 1 ? "Tag" : "Tage"}`
                : urgent
                  ? `Testphase endet in ${daysRemaining} ${daysRemaining === 1 ? "Tag" : "Tagen"} — Tarif sichern`
                  : soonEnding
                    ? `Noch ${daysRemaining} Tage Testphase — rechtzeitig Tarif wählen`
                    : `Testphase: noch ${daysRemaining} ${daysRemaining === 1 ? "Tag" : "Tage"}`}
            </p>
            <p className="mt-0.5 text-xs opacity-90">
              {flyerCampaignLabel
                ? `30 Tage kostenlos · bis zu ${TRIAL_MAX_EMPLOYEES} Mitarbeitende (${activeEmployees}/${TRIAL_MAX_EMPLOYEES} aktiv). Keine Kreditkarte nötig — Tarif erst nach der Aktion.`
                : `Bis zu ${TRIAL_MAX_EMPLOYEES} Mitarbeitende (${activeEmployees}/${TRIAL_MAX_EMPLOYEES} aktiv). Petite All-In ab 29 € — PDF, DATEV & Lohnbüro inklusive.`}
              {endLabel ? (
                <>
                  {" "}
                  Endet am <span className="font-semibold">{endLabel}</span> Uhr.
                </>
              ) : null}
            </p>
          </div>
        </div>
        {isManager ? (
          urgent || soonEnding ? (
            <button
              type="button"
              onClick={() => openUpgrade({ kind: "trial_ending", daysRemaining })}
              className="inline-flex min-h-9 shrink-0 items-center rounded-xl bg-brand px-3 text-xs font-semibold text-brand-foreground"
            >
              {urgent ? "Heute Tarif sichern" : "Tarif sichern — ein Klick"}
            </button>
          ) : (
            <Link
              href="/dashboard/billing"
              className="inline-flex min-h-9 shrink-0 items-center rounded-xl bg-brand px-3 text-xs font-semibold text-brand-foreground"
            >
              Tarif wählen
            </Link>
          )
        ) : (
          <p className="shrink-0 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-muted-foreground dark:border-white/10">
            Tarif wählt deine Leitung
          </p>
        )}
      </div>
    </div>
  );
}
