import Link from "next/link";
import { Clock, Sparkles } from "lucide-react";
import { TRIAL_MAX_EMPLOYEES } from "@/lib/trial/constants";

export function TrialStatusBanner({
  daysRemaining,
  activeEmployees,
}: {
  daysRemaining: number;
  activeEmployees: number;
}) {
  const urgent = daysRemaining <= 2;
  const soonEnding = daysRemaining <= 3 && daysRemaining > 2;

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
              {urgent
                ? `Testphase endet in ${daysRemaining} ${daysRemaining === 1 ? "Tag" : "Tagen"} — Tarif sichern`
                : soonEnding
                  ? `Noch ${daysRemaining} Tage Testphase — rechtzeitig Tarif wählen`
                  : `Testphase: noch ${daysRemaining} ${daysRemaining === 1 ? "Tag" : "Tage"}`}
            </p>
            <p className="mt-0.5 text-xs opacity-90">
              Bis zu {TRIAL_MAX_EMPLOYEES} Mitarbeitende ({activeEmployees}/{TRIAL_MAX_EMPLOYEES} aktiv). PDF & Lohnbüro
              ab Business — danach ohne Unterbrechung weiterplanen.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/billing"
          className="inline-flex min-h-9 shrink-0 items-center rounded-xl bg-brand px-3 text-xs font-semibold text-brand-foreground"
        >
          {urgent ? "Jetzt Tarif wählen" : "Tarif wählen"}
        </Link>
      </div>
    </div>
  );
}
