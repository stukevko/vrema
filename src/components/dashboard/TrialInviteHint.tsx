"use client";

import { Users } from "lucide-react";
import { TRIAL_MAX_EMPLOYEES } from "@/lib/trial/constants";
import { useUpgrade } from "@/components/dashboard/UpgradeContext";

export function TrialInviteHint({
  activeEmployees,
  atLimit,
}: {
  activeEmployees: number;
  atLimit?: boolean;
}) {
  const { openUpgrade } = useUpgrade();
  const remaining = Math.max(0, TRIAL_MAX_EMPLOYEES - activeEmployees);
  const showWarning = atLimit || remaining <= 1;

  if (!showWarning) return null;

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-xs ${
        atLimit
          ? "border-amber-300/50 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100"
          : "border-brand/25 bg-brand-soft/50 text-foreground dark:border-white/10 dark:bg-brand/12"
      }`}
    >
      <div className="flex gap-2">
        <Users className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div className="min-w-0 space-y-2">
          {atLimit ? (
            <p className="font-semibold">Testlimit erreicht ({TRIAL_MAX_EMPLOYEES} Mitarbeitende)</p>
          ) : (
            <p className="font-semibold">
              Noch {remaining} {remaining === 1 ? "Platz" : "Plätze"} in der Testphase
            </p>
          )}
          <p className="leading-relaxed opacity-90">
            {atLimit
              ? "Ein Klick — Tarif wählen — bis zu 10 Mitarbeitende mit Starter."
              : "In der Testphase sind maximal 3 aktive Mitarbeitende möglich."}
          </p>
          {atLimit ? (
            <button
              type="button"
              onClick={() => openUpgrade({ kind: "trial_employee_limit" })}
              className="inline-flex min-h-10 items-center rounded-xl bg-brand px-4 text-[11px] font-semibold text-brand-foreground"
            >
              Tarif wählen — ein Klick
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
