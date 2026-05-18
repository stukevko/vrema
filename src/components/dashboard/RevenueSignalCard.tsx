import Link from "next/link";
import { Euro } from "lucide-react";
import { getFiscalHealthCheck } from "@/lib/planning/intelligence";

export async function RevenueSignalCard({ companyId }: { companyId: string }) {
  const fiscal = await getFiscalHealthCheck(companyId);
  if (!fiscal.hasData || fiscal.revenueEuro == null) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-card/50 p-5">
        <p className="text-sm font-semibold text-foreground">Umsatz & Personalquote</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Trage den geschätzten Wochenumsatz in den Einstellungen ein oder importiere CSV — dann siehst du, ob der
          Plan zur Kasse passt.
        </p>
        <Link href="/dashboard/settings" className="mt-3 inline-flex text-xs font-semibold text-brand hover:underline">
          Umsatz hinterlegen
        </Link>
      </section>
    );
  }

  const pct = fiscal.laborShare != null ? Math.round(fiscal.laborShare * 100) : null;
  const pctLabel = pct != null ? `${pct} % Personalquote (Plan)` : "—";
  const status =
    fiscal.overBudget
      ? "Plan liegt über dem üblichen Rahmen (~35 %) — Schichten prüfen."
      : "Plan passt zum hinterlegten Wochenumsatz.";

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Euro className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Umsatz-Signal</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Planer-Woche {fiscal.weekIndex} · Ø {fiscal.revenueEuro.toLocaleString("de-DE")} € Umsatz/Woche
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Geplante Lohnkosten</p>
          <p className="mt-1 text-lg font-bold tabular-nums">{fiscal.laborEuro.toLocaleString("de-DE")} €</p>
        </div>
        <div
          className={`rounded-xl border px-3 py-2 ${
            fiscal.overBudget ? "border-amber-300/50 bg-amber-50/80 dark:bg-amber-500/10" : "border-emerald-300/40 bg-emerald-50/60 dark:bg-emerald-500/10"
          }`}
        >
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Quote</p>
          <p className="mt-1 text-lg font-bold tabular-nums">{pctLabel}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{status}</p>
      {fiscal.peakDayLabel ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Teuerster Tag im Plan: {fiscal.peakDayLabel} (~{fiscal.peakDayEuro?.toLocaleString("de-DE")} € Lohn)
        </p>
      ) : null}
      <Link href="/dashboard/settings" className="mt-3 inline-flex text-xs font-semibold text-brand hover:underline">
        Umsatz anpassen oder CSV importieren
      </Link>
    </section>
  );
}
