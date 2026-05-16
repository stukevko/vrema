import Link from "next/link";
import { ShieldCheck, AlertTriangle, AlertOctagon, ChevronRight } from "lucide-react";
import { SafeLucideIcon } from "@/lib/icons/safe-lucide";
import { getWeeklyComplianceReport } from "@/lib/actions/compliance";
import { getBerlinDateKey } from "@/lib/time/timezone";
import { shortLabelForRule, type ArbZgRuleId } from "@/lib/compliance/arbzg";

/**
 * Owner/Manager-Widget: ArbZG-Compliance-Score der aktuellen Woche.
 *
 *  Server Component – holt sich den Bericht selbst und versteckt sich still,
 *  wenn die Engine wegen leerer Schichtwoche nichts zu sagen hat.
 */
export async function ComplianceCard() {
  const today = new Date();
  // Wochenstart Montag in Berlin
  const day = getBerlinDateKey(today);
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = date.getUTCDay();
  const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mondayDate = new Date(date.getTime() + offsetToMonday * 86_400_000);
  const weekStart = getBerlinDateKey(mondayDate);

  let report: Awaited<ReturnType<typeof getWeeklyComplianceReport>> | null = null;
  try {
    report = await getWeeklyComplianceReport(weekStart);
  } catch {
    return null;
  }

  // Sales-Story-Karte auch im Best-Case zeigen ("100 / 100 — saubere Woche").
  const hasIssues = report.violations > 0 || report.warnings > 0;
  const status: "perfect" | "watch" | "alert" =
    report.violations > 0 ? "alert" : report.warnings > 0 ? "watch" : "perfect";

  const tone = {
    perfect: {
      icon: ShieldCheck,
      ring: "border-emerald-300/40 dark:border-emerald-300/15",
      bg: "bg-emerald-50/70 dark:bg-emerald-500/[0.06]",
      title: "Compliance: alles im grünen Bereich",
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
    },
    watch: {
      icon: AlertTriangle,
      ring: "border-amber-300/45 dark:border-amber-300/15",
      bg: "bg-amber-50/70 dark:bg-amber-500/[0.08]",
      title: "Compliance: Augen offen halten",
      badge: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
    },
    alert: {
      icon: AlertOctagon,
      ring: "border-rose-300/45 dark:border-rose-300/15",
      bg: "bg-rose-50/70 dark:bg-rose-500/[0.07]",
      title: "Compliance: ArbZG-Verstöße in dieser Woche",
      badge: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
    },
  }[status];

  // Pro-Regel-Counter für die Detailzeile
  const ruleEntries = (Object.entries(report.perRule) as [ArbZgRuleId, number][]).filter(
    ([, count]) => count > 0,
  );

  return (
    <section
      className={`rounded-2xl border p-5 shadow-sm transition-colors ${tone.ring} ${tone.bg}`}
      aria-label="ArbZG-Compliance"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card/80 text-foreground shadow-sm dark:bg-surface/70">
          <SafeLucideIcon icon={tone.icon} className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">{tone.title}</h3>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${tone.badge}`}>
              Score {report.score}/100
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Auswertung KW {report.weekStart} – {report.weekEnd}: Tages-/Wochenstunden, Ruhezeit und Pausen nach ArbZG §3 – §5.
          </p>

          {hasIssues && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {ruleEntries.map(([ruleId, count]) => (
                <span
                  key={ruleId}
                  className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/80 px-2 py-0.5 text-[11px] font-medium text-foreground dark:bg-surface/60"
                >
                  {shortLabelForRule(ruleId)}
                  <span className="rounded-full bg-foreground/10 px-1.5 text-[10px] font-bold leading-tight">
                    {count}
                  </span>
                </span>
              ))}
            </div>
          )}

          <div className="mt-4">
            <Link
              href="/dashboard/planning"
              className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:underline"
            >
              Im Schichtplaner ansehen
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
