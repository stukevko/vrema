import Link from "next/link";
import { Scale } from "lucide-react";
import { getTodayPlanVsIst, formatMinutesDe } from "@/lib/dashboard/plan-vs-ist";

export async function PlanVsIstCard({ companyId }: { companyId: string }) {
  const data = await getTodayPlanVsIst(companyId);
  if (!data) return null;

  const delta = data.workedTotalMinutes - data.plannedTotalMinutes;
  const deltaLabel =
    Math.abs(delta) < 15
      ? "Passt zum Plan"
      : delta > 0
        ? `${formatMinutesDe(delta)} mehr als geplant`
        : `${formatMinutesDe(Math.abs(delta))} weniger als geplant`;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground/5 text-brand">
          <Scale className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Plan vs. heute</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{data.dateLabel}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Geplant</p>
          <p className="mt-1 text-lg font-bold tabular-nums">{formatMinutesDe(data.plannedTotalMinutes)}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Gestempelt</p>
          <p className="mt-1 text-lg font-bold tabular-nums">{formatMinutesDe(data.workedTotalMinutes)}</p>
        </div>
        <div className="col-span-2 rounded-xl border border-brand/20 bg-brand/5 px-3 py-2 sm:col-span-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Stand</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{deltaLabel}</p>
        </div>
      </div>
      {data.rows.length > 0 ? (
        <ul className="mt-4 space-y-1.5 text-xs">
          {data.rows.map((r) => (
            <li key={r.userName} className="flex justify-between gap-2 text-muted-foreground">
              <span className="truncate font-medium text-foreground">{r.userName}</span>
              <span className="shrink-0 tabular-nums">
                {formatMinutesDe(r.workedMinutes)} / {formatMinutesDe(r.plannedMinutes)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <Link
        href="/dashboard/reports"
        className="mt-4 inline-flex text-xs font-semibold text-brand hover:underline"
      >
        Details in Berichte
      </Link>
    </section>
  );
}
