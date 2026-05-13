import Link from "next/link";
import {
  Brain,
  ShieldCheck,
  Cpu,
  Lock,
  ArrowRight,
  CloudSun,
  History,
  CalendarOff,
  Sparkles,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  getNeuralRecommendationsForOwner,
  getNeuralAccuracy,
} from "@/lib/actions/neural";

/**
 *  VREMA Neural Engine — Dashboard-Karte.
 *  Server Component: ruft Empfehlungs-Bundle + Treffsicherheit ab.
 *
 *  Marketing-Sprache (User sieht):
 *    - "VREMA Empfehlungen" als Titel
 *    - "Privat verarbeitet auf deinem Server" als Trust-Badge
 *    - Modell-Tag im Footer, damit Owner versteht woher die Aussage kommt.
 */
export async function VremaNeuralCard() {
  let bundle: Awaited<ReturnType<typeof getNeuralRecommendationsForOwner>> | null = null;
  let accuracy: Awaited<ReturnType<typeof getNeuralAccuracy>> | null = null;
  try {
    [bundle, accuracy] = await Promise.all([
      getNeuralRecommendationsForOwner(),
      getNeuralAccuracy().catch(() => null),
    ]);
  } catch {
    return null;
  }

  if (!bundle) return null;

  const isLocal = bundle.mode === "local";

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/[0.06] dark:bg-surface/70"
      aria-label="VREMA Neural Empfehlungen"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-brand/15 blur-3xl"
      />

      <header className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand shadow-sm dark:bg-brand/15">
            <Brain className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">
              VREMA Empfehlungen
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Kontext-basierte Vorschläge aus Wetter, Historie, Feiertagen und Branche.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
              isLocal
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200"
                : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
            }`}
          >
            {isLocal ? <Cpu className="h-3 w-3" aria-hidden /> : <ShieldCheck className="h-3 w-3" aria-hidden />}
            {isLocal ? "Lokal · Privat" : "Heuristik-Modus"}
          </span>
          {isLocal && (
            <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground dark:bg-white/[0.04]">
              <Lock className="h-3 w-3" aria-hidden />
              On-Premise
            </span>
          )}
        </div>
      </header>

      {bundle.recommendations.length === 0 ? (
        <div className="relative mt-5 rounded-xl border border-emerald-300/40 bg-emerald-50/60 px-4 py-5 text-sm dark:border-emerald-500/15 dark:bg-emerald-500/[0.06]">
          <p className="font-semibold text-emerald-800 dark:text-emerald-200">
            Aktuell keine Auffälligkeiten in der kommenden Woche.
          </p>
          <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-200/80">
            VREMA wird sich melden, sobald Wetter, Feiertage oder Historie eine Anpassung nahelegen.
          </p>
        </div>
      ) : (
        <ul className="relative mt-5 space-y-2">
          {bundle.recommendations.map((r) => (
            <RecItem key={r.id} rec={r} />
          ))}
        </ul>
      )}

      <footer className="relative mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-[10px] text-muted-foreground dark:border-white/[0.04]">
        <span className="font-mono tabular-nums">
          Modell: <span className="font-semibold text-foreground/80">{bundle.modelTag}</span> ·{" "}
          {new Date(bundle.generatedAt).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}
        </span>
        {accuracy && accuracy.samples > 0 && accuracy.avgMae != null && (
          <span>
            Treffsicherheit (letzte {accuracy.samples} Wochen): MAE ≈ {accuracy.avgMae}
          </span>
        )}
        <Link href="/dashboard/planning" className="font-semibold text-brand hover:underline">
          Im Planer öffnen →
        </Link>
      </footer>
    </section>
  );
}

function RecItem({ rec }: { rec: Awaited<ReturnType<typeof getNeuralRecommendationsForOwner>>["recommendations"][number] }) {
  const tone = {
    closed: {
      ring: "border-slate-300/40 dark:border-slate-500/20",
      bg: "bg-slate-100/60 dark:bg-slate-500/[0.07]",
      icon: CalendarOff,
      iconClass: "text-slate-700 dark:text-slate-300",
    },
    calm: {
      ring: "border-emerald-300/40 dark:border-emerald-500/15",
      bg: "bg-emerald-50/60 dark:bg-emerald-500/[0.06]",
      icon: CheckCircle2,
      iconClass: "text-emerald-700 dark:text-emerald-200",
    },
    watch: {
      ring: "border-amber-300/45 dark:border-amber-500/15",
      bg: "bg-amber-50/60 dark:bg-amber-500/[0.07]",
      icon: AlertTriangle,
      iconClass: "text-amber-700 dark:text-amber-200",
    },
    urgent: {
      ring: "border-rose-300/45 dark:border-rose-500/15",
      bg: "bg-rose-50/60 dark:bg-rose-500/[0.07]",
      icon: AlertOctagon,
      iconClass: "text-rose-700 dark:text-rose-300",
    },
  }[rec.tone];

  const Icon = tone.icon;
  const dateLabel = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(new Date(`${rec.date}T12:00:00Z`));

  return (
    <li className={`rounded-xl border ${tone.ring} ${tone.bg} px-4 py-3`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.iconClass}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-foreground">{rec.title}</p>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {dateLabel} · {Math.round(rec.confidence * 100)} % Konfidenz
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-foreground/85">{rec.reasoning}</p>
          {rec.sources.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {rec.sources.map((s) => (
                <SourceBadge key={s} kind={s} />
              ))}
            </div>
          )}
        </div>
        {rec.delta != null && rec.delta !== 0 && (
          <Link
            href="/dashboard/planning"
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-foreground/[0.04] px-2.5 text-[11px] font-bold text-foreground transition-colors hover:bg-foreground/[0.08] dark:bg-white/[0.04]"
            title="Im Schichtplaner öffnen"
          >
            Anwenden
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </li>
  );
}

function SourceBadge({ kind }: { kind: string }) {
  const map: Record<string, { label: string; Icon: typeof Brain }> = {
    weather: { label: "Wetter", Icon: CloudSun },
    history: { label: "Historie", Icon: History },
    holiday: { label: "Feiertag", Icon: CalendarOff },
    bridge_day: { label: "Brückentag", Icon: Sparkles },
    absence: { label: "Krankenstand", Icon: AlertTriangle },
    revenue: { label: "Umsatz", Icon: CheckCircle2 },
    industry: { label: "Branche", Icon: Brain },
  };
  const entry = map[kind] ?? { label: kind, Icon: Brain };
  const I = entry.Icon;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground dark:bg-white/[0.04]">
      <I className="h-2.5 w-2.5" aria-hidden />
      {entry.label}
    </span>
  );
}
