"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCompanyModules } from "@/lib/actions/company-modules";
import {
  COMPANY_MODULE_LABELS,
  industryModuleDefaults,
  type CompanyModuleKey,
  type CompanyModules,
} from "@/lib/company-modules";
import type { CompanyIndustry } from "@prisma/client";
import { userErrorMessage } from "@/lib/errors/user-message";
import { Sparkles } from "lucide-react";

const MODULE_ORDER: CompanyModuleKey[] = [
  "peaks",
  "plannerWeather",
  "shiftTrade",
  "shiftTasks",
  "autopilot",
];

type Props = {
  initialModules: CompanyModules;
  industry: CompanyIndustry | null;
};

export function CompanyModulesSection({ initialModules, industry }: Props) {
  const router = useRouter();
  const [modules, setModules] = useState(initialModules);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const applyIndustryDefaults = () => {
    const defaults = industryModuleDefaults(industry);
    setMessage(null);
    startTransition(async () => {
      try {
        await updateCompanyModules(defaults);
        setModules(defaults);
        setMessage("Vorschläge für deine Branche übernommen — Navigation und Planer aktualisiert.");
        router.refresh();
      } catch (e: unknown) {
        setMessage(userErrorMessage(e, "Speichern fehlgeschlagen."));
      }
    });
  };

  const toggle = (key: CompanyModuleKey, value: boolean) => {
    setMessage(null);
    startTransition(async () => {
      try {
        await updateCompanyModules({ [key]: value });
        setModules((prev) => ({ ...prev, [key]: value }));
        setMessage(
          value
            ? `${COMPANY_MODULE_LABELS[key].title} aktiviert — erscheint in Menü und Planer.`
            : `${COMPANY_MODULE_LABELS[key].title} deaktiviert.`,
        );
        router.refresh();
      } catch (e: unknown) {
        setMessage(userErrorMessage(e, "Speichern fehlgeschlagen."));
      }
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Der Kern bleibt immer aktiv: Stempeln, Schichtplan, Abwesenheit und Berichte. Hier schaltest du
        Erweiterungen für deinen Betrieb frei — ohne andere Branchen zu überfordern.
      </p>

      {industry ? (
        <button
          type="button"
          disabled={isPending}
          onClick={applyIndustryDefaults}
          className="text-sm font-semibold text-brand underline-offset-2 hover:underline disabled:opacity-50"
        >
          Vorschläge für meine Branche übernehmen
        </button>
      ) : null}

      <ul className="space-y-3">
        {MODULE_ORDER.map((key) => {
          const meta = COMPANY_MODULE_LABELS[key];
          const checked = modules[key];
          return (
            <li
              key={key}
              className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {meta.title}
                  {key === "autopilot" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                      <Sparkles className="h-3 w-3" aria-hidden />
                      Beta
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{meta.description}</p>
              </div>
              <label className="relative mt-1 inline-flex shrink-0 cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={checked}
                  disabled={isPending}
                  onChange={(e) => toggle(key, e.target.checked)}
                />
                <span className="h-6 w-11 rounded-full bg-muted transition peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 peer-disabled:opacity-50" />
                <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-background shadow transition peer-checked:translate-x-5" />
              </label>
            </li>
          );
        })}
      </ul>

      {message ? <p className="text-xs text-foreground">{message}</p> : null}
    </div>
  );
}
