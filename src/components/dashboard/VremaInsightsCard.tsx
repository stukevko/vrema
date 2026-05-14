import Link from "next/link";
import {
  Brain,
  ShieldCheck,
  Lock,
  AlertOctagon,
  AlertTriangle,
  Info,
  ChevronRight,
  Activity,
  Clock,
  Users,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import { getInsightsForOwner } from "@/lib/actions/insights";
import type { Insight, InsightSeverity, InsightSource } from "@/lib/ai/insights";

/**
 *  VREMA Insights – Dashboard-Widget der Native Core AI.
 *
 *  Zeigt konkrete, zahlenbasierte Erkenntnisse aus den eigenen Tenant-Daten.
 *  Kein LLM, keine generischen Texte. Wenn die Datenbasis zu klein ist oder
 *  alles im grünen Bereich liegt, blenden wir die Karte ruhig aus –
 *  besser ein leerer Bildschirm als ein leeres Versprechen.
 */
export async function VremaInsightsCard() {
  let insights: Insight[] = [];
  try {
    insights = await getInsightsForOwner();
  } catch {
    return null;
  }

  // Wenn es nichts auffälliges gibt → Empty-State zeigen.
  // Vorgabe: keine Dead-Ends, immer kurze positive Story.
  const hasInsights = insights.length > 0;

  return (
    <section
      id="vrema-insights"
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/[0.06] dark:bg-surface/70"
      aria-label="VREMA Insights"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-brand/15 blur-3xl"
      />
      <header className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand shadow-sm dark:bg-brand/15">
            <Activity className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">
              VREMA Insights
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Native Core AI · 100 % aus deinen eigenen Daten errechnet.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
            <ShieldCheck className="h-3 w-3" aria-hidden />
            DSGVO-nativ
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground dark:bg-white/[0.04]">
            <Lock className="h-3 w-3" aria-hidden />
            Kein LLM
          </span>
        </div>
      </header>

      {hasInsights ? (
        <ul className="relative mt-5 space-y-2">
          {insights.map((i) => (
            <InsightItem key={i.id} insight={i} />
          ))}
        </ul>
      ) : (
        <div className="relative mt-5 rounded-xl border border-emerald-300/40 bg-emerald-50/60 px-4 py-5 text-sm dark:border-emerald-500/15 dark:bg-emerald-500/[0.06]">
          <p className="font-semibold text-emerald-800 dark:text-emerald-200">
            Aktuell keine Auffälligkeiten – sauber gearbeitet.
          </p>
          <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-200/80">
            VREMA überwacht Verspätungen, Über-/Unterbesetzung, Krankenstand und Plan-Realität-Abweichungen
            laufend. Wenn ein Muster auftaucht, erscheint es hier.
          </p>
        </div>
      )}

      <footer className="relative mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-[10px] text-muted-foreground dark:border-white/[0.04]">
        <span>
          Die Core-AI lernt automatisch aus jedem finalisierten Plan – Faktoren ∈ [0,3 .. 3,0].
        </span>
        <Link
          href="/dashboard/settings#ai-insights"
          className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
        >
          KI-Audit öffnen
          <ChevronRight className="h-3 w-3" />
        </Link>
      </footer>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
//  Item-Komponente: konkrete Insight-Karte
// ──────────────────────────────────────────────────────────────────────────

function InsightItem({ insight }: { insight: Insight }) {
  const tone = severityTone(insight.severity);
  const SourceIcon = sourceIcon(insight.source);
  const SeverityIcon = severityIcon(insight.severity);

  return (
    <li className={`rounded-xl border ${tone.ring} ${tone.bg} px-4 py-3`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tone.iconBg}`}>
          <SourceIcon className={`h-3.5 w-3.5 ${tone.iconText}`} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <SeverityIcon className={`h-3.5 w-3.5 ${tone.iconText}`} aria-hidden />
              {insight.title}
            </p>
            <span className="font-mono text-xs font-bold tabular-nums text-foreground">{insight.metric}</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-foreground/85">
            <span className="font-medium text-foreground/95">Beleg:</span> {insight.evidence}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground/80">Empfehlung:</span> {insight.recommendation}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground dark:bg-white/[0.04]">
              n = {insight.sampleSize}
            </span>
            {insight.href && (
              <Link
                href={insight.href}
                className="inline-flex h-7 items-center gap-1 rounded-lg bg-foreground/[0.04] px-2 text-[11px] font-bold text-foreground transition-colors hover:bg-foreground/[0.08] dark:bg-white/[0.04]"
              >
                Im Detail prüfen
                <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

// ──────────────────────────────────────────────────────────────────────────
//  Style-Maps
// ──────────────────────────────────────────────────────────────────────────

function severityTone(s: InsightSeverity) {
  if (s === "urgent") {
    return {
      ring: "border-rose-300/45 dark:border-rose-500/15",
      bg: "bg-rose-50/60 dark:bg-rose-500/[0.06]",
      iconBg: "bg-rose-100 dark:bg-rose-500/15",
      iconText: "text-rose-700 dark:text-rose-300",
    };
  }
  if (s === "watch") {
    return {
      ring: "border-amber-300/45 dark:border-amber-500/15",
      bg: "bg-amber-50/60 dark:bg-amber-500/[0.07]",
      iconBg: "bg-amber-100 dark:bg-amber-500/15",
      iconText: "text-amber-700 dark:text-amber-200",
    };
  }
  return {
    ring: "border-sky-300/40 dark:border-sky-500/15",
    bg: "bg-sky-50/60 dark:bg-sky-500/[0.06]",
    iconBg: "bg-sky-100 dark:bg-sky-500/15",
    iconText: "text-sky-700 dark:text-sky-200",
  };
}

function severityIcon(s: InsightSeverity) {
  if (s === "urgent") return AlertOctagon;
  if (s === "watch") return AlertTriangle;
  return Info;
}

function sourceIcon(src: InsightSource) {
  switch (src) {
    case "lateness":
      return Clock;
    case "overstaffing":
    case "understaffing":
      return Users;
    case "sick_cluster":
      return Stethoscope;
    case "fluctuation":
      return TrendingUp;
    default:
      return Brain;
  }
}
