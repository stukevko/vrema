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
} from "lucide-react";
import { getStaffingForecastHorizon } from "@/lib/actions/predictive";
import {
  staffingActionLine,
  staffingTrustLabel,
  staffingWhyHint,
} from "@/lib/predictive/staffing-copy";
import type { WeatherCondition } from "@/lib/predictive/staffing";
import { SafeLucideIcon } from "@/lib/icons/safe-lucide";

/**
 * Dashboard: Wochen-Vorschau in Klartext (keine Score-Prozente).
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
      aria-label="Personal-Tipp für die Planung"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-brand" aria-hidden />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">
              Personal-Tipp · kommende Woche
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Was du beim Planen beachten solltest · {primary.label}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
              usesNative
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200"
                : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
            }`}
          >
            {usesNative ? "Kennt deinen Betrieb" : "Erste Einschätzung"}
          </span>
          <Link
            href="/dashboard/planning"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            Im Planer planen
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
                {week.isPrimary ? "Diese Woche planen" : "Die Woche danach"} · {week.label}
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

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Kein Bewertungs-Score: VREMA vergleicht deinen Plan mit typischen Tagen, Feiertagen und Wetter.
        Je öfter du einen Wochenplan abschließt, desto treffender die Tipps.
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
        label: "Ruhig",
      },
      watch: {
        ring: "border-amber-300/45 dark:border-amber-500/15",
        bg: "bg-amber-50/60 dark:bg-amber-500/[0.07]",
        label: "Achtung",
      },
      urgent: {
        ring: "border-rose-300/45 dark:border-rose-500/15",
        bg: "bg-rose-50/60 dark:bg-rose-500/[0.07]",
        label: "Viel los",
      },
    }[tone] ?? {
      ring: "border-border dark:border-white/10",
      bg: "bg-card dark:bg-surface/70",
      label: "Normal",
    };

  const weatherLabel =
    recommendation.drivers.find((d) => /Sonn|Bew|Regen|Sturm|Schnee/.test(d.label))?.label ?? "";
  const WeatherIcon = weatherIconFor(weatherLabel);
  const action = staffingActionLine(recommendation.delta, tone);
  const trust = staffingTrustLabel(recommendation.confidence, source);
  const why = staffingWhyHint(recommendation.drivers);

  return (
    <li
      className={`rounded-xl border ${toneStyles.ring} ${toneStyles.bg} p-3`}
      title={`${action}. ${why}. ${trust}`}
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
        <p
          className="mt-1 truncate text-[10px] font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300"
          title={holidayName}
        >
          {holidayName}
        </p>
      ) : isBridge ? (
        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-brand">Brückentag</p>
      ) : (
        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {toneStyles.label}
        </p>
      )}
      <p className="mt-2 text-sm font-semibold leading-snug text-foreground">{action}</p>
      <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted-foreground">{why}</p>
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
