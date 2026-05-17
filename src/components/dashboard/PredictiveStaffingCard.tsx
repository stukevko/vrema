import Link from "next/link";
import {
  Brain,
  ChevronRight,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Wind,
  CalendarOff,
  Sparkles,
  Cpu,
} from "lucide-react";
import { getStaffingForecastHorizon } from "@/lib/actions/predictive";
import type { WeatherCondition } from "@/lib/predictive/staffing";
import { SafeLucideIcon } from "@/lib/icons/safe-lucide";

/**
 * Dashboard: Personal-Vorhersage **vorwärts** (kommende Planungswochen, nicht Vergangenheit).
 */
export async function PredictiveStaffingCard() {
  let horizon: Awaited<ReturnType<typeof getStaffingForecastHorizon>> | null = null;
  try {
    horizon = await getStaffingForecastHorizon();
  } catch {
    return null;
  }

  if (!horizon?.weeks.length) return null;

  const allDays = horizon.weeks.flatMap((w) => w.days);
  const nativeDays = allDays.filter((r) => r.source === "native").length;
  const usesNative = nativeDays > 0;
  const primary = horizon.weeks.find((w) => w.isPrimary) ?? horizon.weeks[0];

  return (
    <section
      className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/[0.06] dark:bg-surface/70"
      aria-label="Personal-Empfehlung"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-brand" aria-hidden />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">
              Personal-Vorhersage · Planung voraus
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Fokus: {primary.label}
              {horizon.cycleWeeks > 1 ? ` · ${horizon.weeks.length}-Wochen-Zyklus` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
              usesNative
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200"
                : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
            }`}
            title={
              usesNative
                ? `${nativeDays} Tage basieren auf deinen bisherigen Plänen.`
                : "Noch wenig Planungsverlauf – Schätzung aus Branche, Feiertagen und Wetter."
            }
          >
            <Cpu className="h-3 w-3" aria-hidden />
            {usesNative ? "Aus Erfahrung" : "Standard-Schätzung"}
          </span>
          <Link
            href="/dashboard/planning"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            Im Planer öffnen
            <ChevronRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </header>

      <div className="mt-5 space-y-6">
        {horizon.weeks.map((week) => (
          <div key={week.weekStart}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3
                className={`text-xs font-bold uppercase tracking-widest ${
                  week.isPrimary ? "text-brand" : "text-muted-foreground"
                }`}
              >
                {week.isPrimary ? "Nächste Woche" : "Danach"} · {week.label}
              </h3>
              {horizon.cycleWeeks > 1 && (
                <span className="rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground dark:bg-white/[0.06]">
                  Planer Woche {week.weekIndex}
                </span>
              )}
            </div>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {week.days.map((r) => (
                <DayPill key={r.date} {...r} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground">
        {usesNative
          ? "Vorhersage für die Wochen, die du jetzt planst – mit Wetter, Feiertagen und deinen bisherigen Plänen. Ab Freitag springt der Fokus automatisch auf die nächste Kalenderwoche."
          : "Empfehlung für kommende Planungswochen (Branche, Feiertage, Wetter). Nach einigen abgeschlossenen Wochenplänen wird sie genauer."}
      </p>
    </section>
  );
}

function DayPill({
  date,
  recommendation,
  tone,
  holidayName,
  isBridge,
  source,
}: Awaited<ReturnType<typeof getStaffingForecastHorizon>>["weeks"][number]["days"][number]) {
  const formatted = new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(new Date(`${date}T12:00:00Z`));

  const toneStyles =
    {
      closed: {
        ring: "border-slate-300/40 dark:border-slate-500/20",
        bg: "bg-slate-100/70 dark:bg-slate-500/[0.07]",
        label: "Geschlossen",
      },
      calm: {
        ring: "border-emerald-300/40 dark:border-emerald-500/15",
        bg: "bg-emerald-50/60 dark:bg-emerald-500/[0.06]",
        label: "Entspannt",
      },
      watch: {
        ring: "border-amber-300/45 dark:border-amber-500/15",
        bg: "bg-amber-50/60 dark:bg-amber-500/[0.07]",
        label: "Aufmerksam",
      },
      urgent: {
        ring: "border-rose-300/45 dark:border-rose-500/15",
        bg: "bg-rose-50/60 dark:bg-rose-500/[0.07]",
        label: "Aufstocken",
      },
    }[tone] ?? {
      ring: "border-border dark:border-white/10",
      bg: "bg-card dark:bg-surface/70",
      label: "Planung",
    };

  const weatherLabel =
    recommendation.drivers.find((d) => /Sonn|Bew|Regen|Sturm|Schnee/.test(d.label))?.label ?? "";
  const WeatherIcon = weatherIconFor(weatherLabel);

  return (
    <li
      className={`rounded-xl border ${toneStyles.ring} ${toneStyles.bg} p-3`}
      title={recommendation.drivers.map((d) => d.label).join(" · ")}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-foreground">{formatted}</span>
        {holidayName ? (
          <CalendarOff className="h-3.5 w-3.5 text-slate-500" aria-hidden />
        ) : isBridge ? (
          <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden />
        ) : (
          <SafeLucideIcon icon={WeatherIcon} className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        )}
      </div>
      {holidayName ? (
        <div
          className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300"
          title={holidayName}
        >
          {holidayName}
        </div>
      ) : isBridge ? (
        <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-brand">Brückentag</div>
      ) : (
        <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {toneStyles.label}
        </div>
      )}
      <div className="mt-2 text-[11px] leading-tight">
        {tone === "closed" ? (
          <span className="text-muted-foreground">Keine Planung empfohlen</span>
        ) : (
          <>
            <strong className="font-semibold text-foreground">
              {recommendation.delta > 0 ? `+${recommendation.delta}` : recommendation.delta} Person
              {Math.abs(recommendation.delta) === 1 ? "" : "en"}
            </strong>{" "}
            <span className="text-muted-foreground">empfohlen</span>
          </>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between gap-1 text-[10px] tabular-nums text-muted-foreground">
        <span>
          {Math.round(recommendation.expectedUtilization * 100)} % · {Math.round(recommendation.confidence * 100)} %
        </span>
        {source === "native" && (
          <span
            className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200"
            title="Basiert auf deinen bisherigen Wochenplänen."
          >
            <Cpu className="h-2 w-2" aria-hidden />
            Erfahrung
          </span>
        )}
      </div>
    </li>
  );
}

function weatherIconFor(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes("sonn")) return Sun;
  if (lower.includes("bew")) return Cloud;
  if (lower.includes("regen")) return CloudRain;
  if (lower.includes("schnee")) return Snowflake;
  if (lower.includes("sturm")) return Wind;
  return Cloud;
}

void (null as unknown as WeatherCondition);
