import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  AlertOctagon,
  AlertTriangle,
  Info,
  ChevronRight,
  History,
  Clock,
  Users,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import { getInsightsForOwner } from "@/lib/actions/insights";
import type { Insight, InsightSeverity, InsightSource } from "@/lib/ai/insights";
import { SafeLucideIcon } from "@/lib/icons/safe-lucide";

/**
 * Rückblick-Hinweise — Klartext, keine Score-Zahlen in der UI.
 * Kommende Woche → Personal-Tipp-Widget.
 */
export async function VremaInsightsCard() {
  let insights: Insight[] = [];
  try {
    insights = await getInsightsForOwner();
  } catch {
    return null;
  }

  const hasInsights = insights.length > 0;

  return (
    <section
      id="vrema-insights"
      className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/[0.06] dark:bg-surface/70"
      aria-label="Hinweise aus den letzten Wochen"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand/15">
            <History className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-bold text-foreground">Was zuletzt auffiel</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Muster aus Stempeluhr, Plan und Abwesenheiten — nicht für die kommende Woche (dafür: Personal-Tipp oben).
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
            <ShieldCheck className="h-3 w-3" aria-hidden />
            Nur deine Firma
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground dark:bg-white/[0.04]">
            <Lock className="h-3 w-3" aria-hidden />
            Kein Chat-KI
          </span>
        </div>
      </header>

      {hasInsights ? (
        <ul className="mt-4 space-y-2">
          {insights.map((i) => (
            <InsightItem key={i.id} insight={i} />
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-xl border border-emerald-300/40 bg-emerald-50/60 px-4 py-4 text-sm dark:border-emerald-500/15 dark:bg-emerald-500/[0.06]">
          <p className="font-semibold text-emerald-800 dark:text-emerald-200">Alles ruhig in den letzten Wochen.</p>
          <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-200/80">
            Sobald Verspätungen, Krankheit oder Plan-Abweichungen auffallen, steht hier ein konkreter Hinweis mit Tipp.
          </p>
        </div>
      )}

      <footer className="mt-4 border-t border-border/60 pt-3 text-[11px] text-muted-foreground dark:border-white/[0.04]">
        Wird genauer, je öfter du Wochenpläne abschließt.{" "}
        <Link href="/dashboard/settings#ai-insights" className="font-semibold text-brand hover:underline">
          Lernfaktoren ansehen
        </Link>
      </footer>
    </section>
  );
}

function InsightItem({ insight }: { insight: Insight }) {
  const tone = severityTone(insight.severity);
  const SourceIcon = sourceIcon(insight.source);
  const SeverityIcon = severityIcon(insight.severity);
  const badge = sourceBadge(insight.source);

  return (
    <li className={`rounded-xl border px-4 py-3 ${tone.ring} ${tone.bg}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tone.iconBg}`}>
          <SafeLucideIcon icon={SourceIcon} className={`h-3.5 w-3.5 ${tone.iconText}`} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <SafeLucideIcon icon={SeverityIcon} className={`h-3.5 w-3.5 ${tone.iconText}`} aria-hidden />
            <p className="text-sm font-semibold leading-snug text-foreground">{plainTitle(insight)}</p>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-foreground/90">{insight.evidence}</p>
          <p className="mt-1 text-xs font-medium text-foreground">{insight.recommendation}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground dark:bg-white/[0.04]">
              {badge}
            </span>
            {insight.href ? (
              <Link
                href={insight.href}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-border/60 bg-card/80 px-2 text-[11px] font-semibold text-foreground hover:bg-muted/40 dark:bg-surface/60"
              >
                Ansehen
                <ChevronRight className="h-3 w-3" aria-hidden />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

/** Titel ohne technische Metrik-Spalte — Zahl steckt im Satz, wenn nötig. */
function plainTitle(insight: Insight): string {
  const m = insight.metric?.trim();
  if (!m || /^[+-]?\d+([.,]\d+)?\s*%/.test(m)) {
    return insight.title;
  }
  if (insight.title.includes(m)) return insight.title;
  return `${insight.title} (${m})`;
}

function sourceBadge(src: InsightSource): string {
  switch (src) {
    case "lateness":
      return "Verspätungen";
    case "overstaffing":
    case "understaffing":
      return "Personalstunden";
    case "sick_cluster":
      return "Krankmeldungen";
    case "fluctuation":
      return "Plan vs. Stempel";
    case "planning":
      return "Planung";
    default:
      return "Betrieb";
  }
}

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
      return History;
  }
}
