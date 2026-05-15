import Link from "next/link";
import { Users, Wallet, TriangleAlert } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

/**
 * Hero-Stats für das Dashboard – das "3-Sekunden-Prinzip":
 * Owner/Manager soll auf einen Blick wissen, ob heute eingegriffen werden muss.
 *
 * UX-Prinzipien:
 *  - Maximal 3 KPIs, viel Whitespace.
 *  - Farbe (Grün/Gelb/Rot) nur dort, wo etwas brennt. Der Rest bleibt Petrol/Slate.
 *  - Klick → direkter Sprung in den Lösungs-Kontext (Reports / Planning / Vacation).
 */

type HeroStatsProps = {
  presentNow: number;
  totalEmployees: number;
  todayPersonnelCostsEuro: number;
  todayPersonnelCostsCurrency?: "EUR";
  attentionCount: number;
  attentionBreakdown: { absent: number; late: number };
  pendingApprovalsCount: number;
};

function formatEuroCents(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function HeroStats({
  presentNow,
  totalEmployees,
  todayPersonnelCostsEuro,
  attentionCount,
  attentionBreakdown,
  pendingApprovalsCount,
}: HeroStatsProps) {
  const presentTone = presentNow > 0 ? "brand" : "muted";
  const attentionTone = attentionCount === 0 ? "brand" : attentionCount <= 2 ? "warning" : "danger";

  return (
    <section
      aria-label="Heutige Kennzahlen"
      className="dashboard-kpi-grid grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3 sm:gap-4"
    >
      {/* KPI 1 – Anwesend jetzt (Petrol, ruhig) */}
      <Link
        href="/dashboard/reports"
        className="group/kpi block min-w-0 max-w-full overflow-hidden rounded-2xl border border-line/60 bg-white/55 p-5 transition-[box-shadow,border-color] duration-150 max-md:shadow-none md:backdrop-blur-md md:hover:border-brand/35 md:hover:shadow-[0_18px_42px_-22px_rgba(10,58,82,0.35)] dark:border-white/[0.06] dark:bg-white/[0.025] sm:p-6"
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <p className="min-w-0 text-[10px] font-semibold uppercase tracking-widest text-fg-muted">
            <Tooltip content="Mitarbeiter, die jetzt eingestempelt sind.">
              <span className="cursor-help">Anwesend jetzt</span>
            </Tooltip>
          </p>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand/15">
            <Users className="h-4 w-4" aria-hidden />
          </span>
        </div>
        <p
          className={`mt-3 min-w-0 max-w-full text-[clamp(1.35rem,5.5vw,1.875rem)] font-bold leading-tight tabular-nums ${presentTone === "brand" ? "text-brand" : "text-fg"}`}
        >
          {presentNow}
          <span className="ml-1 text-base font-medium text-fg-muted">/ {totalEmployees}</span>
        </p>
        <p className="mt-1 text-xs text-fg-muted">
          {presentNow === 0
            ? "Aktuell niemand eingestempelt."
            : `${Math.round((presentNow / Math.max(1, totalEmployees)) * 100)} % des Teams im Einsatz`}
        </p>
      </Link>

      {/* KPI 2 – Heutige Personalkosten (Petrol, Detail über Tooltip) */}
      <Link
        href="/dashboard/reports"
        className="group/kpi block min-w-0 max-w-full overflow-hidden rounded-2xl border border-line/60 bg-white/55 p-5 transition-[box-shadow,border-color] duration-150 max-md:shadow-none md:backdrop-blur-md md:hover:border-brand/35 md:hover:shadow-[0_18px_42px_-22px_rgba(10,58,82,0.35)] dark:border-white/[0.06] dark:bg-white/[0.025] sm:p-6"
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <p className="min-w-0 text-[10px] font-semibold uppercase tracking-widest text-fg-muted">
            <Tooltip content="Hochrechnung: gestempelte Stunden heute × hinterlegter Stundenlohn.">
              <span className="cursor-help">Heutige Personalkosten</span>
            </Tooltip>
          </p>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand/15">
            <Wallet className="h-4 w-4" aria-hidden />
          </span>
        </div>
        <p
          className="mt-3 min-w-0 max-w-full text-[clamp(1.1rem,4.8vw,1.875rem)] font-bold leading-tight tabular-nums text-brand break-all sm:break-normal"
          title={todayPersonnelCostsEuro > 0 ? formatEuroCents(todayPersonnelCostsEuro) : undefined}
        >
          {todayPersonnelCostsEuro > 0 ? formatEuroCents(todayPersonnelCostsEuro) : "—"}
        </p>
        <p className="mt-1 text-xs text-fg-muted">
          {todayPersonnelCostsEuro > 0
            ? "Stand: jetzt · ohne offene Schichten am Ende der Schicht abgerechnet"
            : "Noch keine berechenbaren Stunden für heute"}
        </p>
      </Link>

      {/* KPI 3 – Auffälligkeiten + offene Genehmigungen (Signal-Farbe) */}
      <Link
        href="/dashboard/reports"
        className={[
          "group/kpi block min-w-0 max-w-full overflow-hidden rounded-2xl border p-5 transition-[box-shadow,border-color] duration-150 max-md:shadow-none md:backdrop-blur-md sm:p-6",
          attentionTone === "brand"
            ? "border-line/60 bg-white/55 md:hover:border-brand/35 md:hover:shadow-[0_18px_42px_-22px_rgba(10,58,82,0.35)] dark:border-white/[0.06] dark:bg-white/[0.025]"
            : attentionTone === "warning"
              ? "border-amber-300/40 bg-amber-50/70 md:hover:border-amber-400/55 md:hover:shadow-[0_18px_42px_-22px_rgba(180,83,9,0.25)] dark:border-amber-300/15 dark:bg-amber-500/[0.05]"
              : "border-rose-300/45 bg-rose-50/70 md:hover:border-rose-400/55 md:hover:shadow-[0_18px_42px_-22px_rgba(190,18,60,0.25)] dark:border-rose-300/20 dark:bg-rose-500/[0.06]",
        ].join(" ")}
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <p className="min-w-0 text-[10px] font-semibold uppercase tracking-widest text-fg-muted">
            <Tooltip content="Verspätet + Fehlend zusammen, plus offene Anträge & Korrekturen, die auf Freigabe warten.">
              <span className="cursor-help">Heute prüfen</span>
            </Tooltip>
          </p>
          <span
            className={[
              "inline-flex h-8 w-8 items-center justify-center rounded-xl",
              attentionTone === "brand"
                ? "bg-brand-soft text-brand dark:bg-brand/15"
                : attentionTone === "warning"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
            ].join(" ")}
          >
            <TriangleAlert className="h-4 w-4" aria-hidden />
          </span>
        </div>
        <p
          className={[
            "mt-3 min-w-0 max-w-full text-[clamp(1.35rem,5.5vw,1.875rem)] font-bold leading-tight tabular-nums",
            attentionTone === "brand"
              ? "text-brand"
              : attentionTone === "warning"
                ? "text-amber-700 dark:text-amber-200"
                : "text-rose-700 dark:text-rose-200",
          ].join(" ")}
        >
          {attentionCount}
        </p>
        <p className="mt-1 text-xs text-fg-muted">
          {attentionCount === 0
            ? pendingApprovalsCount > 0
              ? `Alles ruhig · ${pendingApprovalsCount} ${pendingApprovalsCount === 1 ? "Antrag" : "Anträge"} offen`
              : "Alles ruhig im Team"
            : [
                attentionBreakdown.absent > 0 ? `${attentionBreakdown.absent} fehlend` : null,
                attentionBreakdown.late > 0 ? `${attentionBreakdown.late} verspätet` : null,
                pendingApprovalsCount > 0
                  ? `${pendingApprovalsCount} ${pendingApprovalsCount === 1 ? "Antrag" : "Anträge"} offen`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
        </p>
      </Link>
    </section>
  );
}
