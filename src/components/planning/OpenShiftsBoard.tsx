import Link from "next/link";
import { Handshake } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { planningToggleTradeOfferFormAction } from "@/app/(dashboard)/dashboard/planning/planning-trade-actions";
import { FormSubmitButton } from "@/components/ui/FormSubmitButton";
import { OpenShiftVacancyForm } from "@/components/planning/OpenShiftVacancyForm";
import type { loadPlanningOpenShifts } from "@/lib/planning/planning-page-data";

const DAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function OpenShiftsBoard({
  open,
  defaultWeekIndex = 1,
  defaultDayOfWeek = 1,
}: {
  open: Awaited<ReturnType<typeof loadPlanningOpenShifts>>;
  defaultWeekIndex?: number;
  defaultDayOfWeek?: number;
}) {
  return (
    <section className="glass-card p-5" id="open-shifts">
      <h2 className="text-base font-semibold tracking-tight">Offene Schichten</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Kolleg:innen können Übernahmen anfragen — du bestätigst unter „Tausch-Freigaben“.
      </p>
      <OpenShiftVacancyForm defaultWeekIndex={defaultWeekIndex} defaultDayOfWeek={defaultDayOfWeek} />
      {open.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Handshake}
            title="Keine offenen Schichten"
            description="Im Timeline-Rechtsklick „Zum Tausch anbieten“ oder Mitarbeitende bieten eigene Schichten an."
            action={
              <Link href="/dashboard/planning" className="text-xs font-semibold text-brand hover:underline">
                Zum Planer
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {open.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/25 bg-warning-soft/50 px-4 py-3 dark:border-white/10"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {s.ownerName} · {DAY_LABELS[s.dayOfWeek]} {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}
                </p>
                {s.pendingRequesterName ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Anfrage von {s.pendingRequesterName} —{" "}
                    <Link href="#shift-trade-approvals" className="font-semibold text-brand hover:underline">
                      freigeben
                    </Link>
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-muted-foreground">Wartet auf Übernahme</p>
                )}
              </div>
              <form action={planningToggleTradeOfferFormAction}>
                <input type="hidden" name="shiftId" value={s.id} />
                <input type="hidden" name="makeOpen" value="false" />
                <FormSubmitButton label="Schließen" pendingLabel="…" className="btn-outline text-xs" />
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
