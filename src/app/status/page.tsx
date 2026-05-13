import type { Metadata } from "next";
import { CheckCircle2, AlertTriangle, XCircle, Activity } from "lucide-react";
import { getSiteUrl } from "@/lib/seo/site";

/**
 *  Öffentliche System-Status-Seite.
 *  Server Component: fetcht /api/health beim Render, no-store.
 */

export const dynamic = "force-dynamic";

const base = getSiteUrl();

export const metadata: Metadata = {
  title: "System-Status · VREMA",
  description:
    "Live-Status der VREMA-Plattform: API, Datenbank, Anmeldung, E-Mail-Versand und VREMA Native AI (On-Premise).",
  alternates: { canonical: `${base}/status` },
};

type Health = {
  status: "operational" | "degraded" | "down";
  latencyMs: number;
  components: Array<{
    id: string;
    label: string;
    state: "operational" | "degraded" | "down";
    latencyMs?: number;
    hint?: string;
  }>;
  checkedAt: string;
};

async function fetchHealth(): Promise<Health | null> {
  try {
    const res = await fetch(`${base}/api/health`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Health;
  } catch {
    return null;
  }
}

export default async function StatusPage() {
  const health = await fetchHealth();

  const tone =
    health?.status === "operational"
      ? {
          ring: "border-emerald-300/45 dark:border-emerald-500/15",
          bg: "bg-emerald-50/70 dark:bg-emerald-500/[0.06]",
          icon: CheckCircle2,
          headline: "Alle Systeme laufen stabil",
          color: "text-emerald-700 dark:text-emerald-200",
        }
      : health?.status === "degraded"
        ? {
            ring: "border-amber-300/45 dark:border-amber-500/15",
            bg: "bg-amber-50/70 dark:bg-amber-500/[0.07]",
            icon: AlertTriangle,
            headline: "Einzelne Komponenten arbeiten eingeschränkt",
            color: "text-amber-700 dark:text-amber-200",
          }
        : {
            ring: "border-rose-300/45 dark:border-rose-500/15",
            bg: "bg-rose-50/70 dark:bg-rose-500/[0.07]",
            icon: XCircle,
            headline: "Ein oder mehrere Systeme sind ausgefallen",
            color: "text-rose-700 dark:text-rose-200",
          };

  const Icon = tone.icon;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand">System-Status</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">VREMA-Plattform-Status</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Diese Seite spiegelt den Live-Zustand unserer wichtigsten Komponenten. Sie wird bei jedem Aufruf neu geprüft.
      </p>

      <section
        className={`mt-8 rounded-3xl border ${tone.ring} ${tone.bg} p-6 shadow-sm`}
        aria-live="polite"
      >
        <div className="flex items-start gap-4">
          <span className="mt-0.5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-card/80 dark:bg-surface/70">
            <Icon className={`h-6 w-6 ${tone.color}`} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className={`text-lg font-bold ${tone.color}`}>{tone.headline}</h2>
            {health ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Geprüft {new Date(health.checkedAt).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })} · Antwortzeit {health.latencyMs} ms
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Health-Check konnte nicht ausgeführt werden.</p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 space-y-3" aria-label="Komponenten">
        {(health?.components ?? []).map((c) => {
          const styles =
            c.state === "operational"
              ? { dot: "bg-emerald-500", text: "Operational" }
              : c.state === "degraded"
                ? { dot: "bg-amber-500", text: "Eingeschränkt" }
                : { dot: "bg-rose-500", text: "Ausfall" };
          return (
            <article
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-white/[0.06] dark:bg-surface/70"
            >
              <div className="flex items-center gap-3">
                <span className={`inline-flex h-2.5 w-2.5 rounded-full ${styles.dot}`} aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-foreground">{c.label}</p>
                  {c.hint ? <p className="text-[11px] text-muted-foreground">{c.hint}</p> : null}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{styles.text}</p>
                {typeof c.latencyMs === "number" && (
                  <p className="text-[10px] tabular-nums text-muted-foreground">{c.latencyMs} ms</p>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <footer className="mt-10 rounded-2xl border border-border bg-surface-muted/50 p-4 text-xs text-muted-foreground dark:bg-surface/40">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5" aria-hidden />
          <span>Vorfälle werden bei Bedarf hier ergänzt. Bei Notfällen erreichst du uns über <a className="underline" href="mailto:support@vrema.io">support@vrema.io</a>.</span>
        </div>
      </footer>
    </div>
  );
}
