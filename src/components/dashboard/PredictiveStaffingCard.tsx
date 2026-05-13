import Link from "next/link";
import { Brain, ChevronRight, Sun, Cloud, CloudRain, Snowflake, Wind } from "lucide-react";
import { getStaffingRecommendations } from "@/lib/actions/predictive";
import { getBerlinDateKey } from "@/lib/time/timezone";
import type { WeatherCondition } from "@/lib/predictive/staffing";

/**
 * Dashboard-Widget: Wochen-Vorschau mit Personal-Empfehlung pro Tag.
 *  Server Component – fetched eigene Daten, fail-silent wenn keine Wetter-Cache vorhanden.
 */
export async function PredictiveStaffingCard() {
  const today = new Date();
  const day = getBerlinDateKey(today);
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = date.getUTCDay();
  const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mondayDate = new Date(date.getTime() + offsetToMonday * 86_400_000);
  const weekStart = getBerlinDateKey(mondayDate);

  let rows: Awaited<ReturnType<typeof getStaffingRecommendations>> | null = null;
  try {
    rows = await getStaffingRecommendations(weekStart);
  } catch {
    return null;
  }

  if (!rows || rows.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/[0.06] dark:bg-surface/70"
      aria-label="Personal-Empfehlung"
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-brand" aria-hidden />
          <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">
            Personal-Vorhersage · KW {rows[0]?.date}
          </h2>
        </div>
        <Link
          href="/dashboard/planning"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
        >
          Im Planer öffnen
          <ChevronRight className="h-3 w-3" aria-hidden />
        </Link>
      </header>

      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {rows.map((r) => (
          <DayPill key={r.date} {...r} />
        ))}
      </ul>

      <p className="mt-4 text-[11px] text-muted-foreground">
        Empfehlung basiert auf Wetter, historischer Auslastung gleicher Wochentage und aktuell geplanten Schichten.
        Wir lügen kein KI-Modell vor – die Logik ist erklärbar im Planer einsehbar.
      </p>
    </section>
  );
}

function DayPill({
  date,
  recommendation,
  tone,
}: Awaited<ReturnType<typeof getStaffingRecommendations>>[number]) {
  const formatted = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" }).format(
    new Date(`${date}T12:00:00Z`),
  );
  const toneStyles = {
    calm: { ring: "border-emerald-300/40 dark:border-emerald-500/15", bg: "bg-emerald-50/60 dark:bg-emerald-500/[0.06]", label: "Entspannt" },
    watch: { ring: "border-amber-300/45 dark:border-amber-500/15", bg: "bg-amber-50/60 dark:bg-amber-500/[0.07]", label: "Aufmerksam" },
    urgent: { ring: "border-rose-300/45 dark:border-rose-500/15", bg: "bg-rose-50/60 dark:bg-rose-500/[0.07]", label: "Aufstocken" },
  }[tone];

  // Wir versuchen, das Wetter-Icon aus den Drivers zu erraten.
  const weatherLabel = recommendation.drivers.find((d) => /Sonn|Bew|Regen|Sturm|Schnee/.test(d.label))?.label ?? "";
  const Icon = weatherIconFor(weatherLabel);

  return (
    <li
      className={`rounded-xl border ${toneStyles.ring} ${toneStyles.bg} p-3`}
      title={recommendation.drivers.map((d) => `${d.label}: ${d.impact.toFixed(2)}`).join(" · ")}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-foreground">{formatted}</span>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      </div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{toneStyles.label}</div>
      <div className="mt-2 text-[11px] leading-tight">
        <strong className="font-semibold text-foreground">
          {recommendation.delta > 0 ? `+${recommendation.delta}` : recommendation.delta} Person{Math.abs(recommendation.delta) === 1 ? "" : "en"}
        </strong>{" "}
        <span className="text-muted-foreground">empfohlen</span>
      </div>
      <div className="mt-1 text-[10px] tabular-nums text-muted-foreground">
        {Math.round(recommendation.expectedUtilization * 100)} % Auslastung · {Math.round(recommendation.confidence * 100)} % Konfidenz
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
