import Link from "next/link";
import { CalendarClock, ChevronRight, ClipboardList, Users } from "lucide-react";
import type { ManagerFocusSnapshot } from "@/lib/dashboard/manager-focus-snapshot";

type Props = {
  snapshot: ManagerFocusSnapshot;
};

function FocusCard({
  tone,
  icon: Icon,
  label,
  title,
  description,
  href,
  cta,
}: {
  tone: "brand" | "warning" | "success" | "muted";
  icon: typeof Users;
  label: string;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  const toneBorder =
    tone === "warning"
      ? "border-warning/35 bg-warning-soft/30"
      : tone === "success"
        ? "border-brand/25 bg-brand-soft/25"
        : tone === "brand"
          ? "border-brand/30 bg-gradient-to-br from-brand/10 to-card"
          : "border-border bg-card";

  return (
    <Link
      href={href}
      className={`group flex min-h-[10.5rem] flex-col rounded-2xl border p-4 shadow-sm transition-[border-color,box-shadow,transform] active:scale-[0.99] sm:p-5 md:hover:shadow-md ${toneBorder}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background text-brand shadow-sm">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <p className="mt-3 text-lg font-bold leading-snug text-foreground">{title}</p>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand">
        {cta}
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}

export function ManagerFocusCards({ snapshot }: Props) {
  const { today, planning, approvals, focusWeek, weekLabel } = snapshot;

  const todayTone =
    today.presentNow === 0 && today.scheduledCount > 0
      ? "warning"
      : today.presentNow > 0
        ? "success"
        : "muted";

  const planningTone = planning.gapSlots > 0 ? "warning" : "success";

  const approvalsTone = approvals.total > 0 ? "warning" : "success";

  return (
    <section aria-label="Dein Fokus heute" className="space-y-3">
      <div className="flex items-end justify-between gap-3 px-0.5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand">Fokus</p>
          <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
            Was heute zählt
          </h2>
        </div>
        <p className="text-right text-[11px] text-muted-foreground">
          Plan-Woche {focusWeek}
          <br />
          <span className="tabular-nums">{weekLabel}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <FocusCard
          tone={todayTone}
          icon={Users}
          label="Heute"
          title={
            today.scheduledCount > 0
              ? `${today.scheduledCount} Schicht${today.scheduledCount === 1 ? "" : "en"} · ${today.presentNow} da`
              : `${today.presentNow} von ${today.totalEmployees} da`
          }
          description={
            today.scheduledCount > 0
              ? "Eingeplant vs. eingestempelt — Abweichungen in den Berichten prüfen."
              : "Heute noch keine Schicht im Plan — Planer öffnen oder Team einladen."
          }
          href="/dashboard/reports"
          cta="Zu den Zeiten"
        />

        <FocusCard
          tone={planningTone}
          icon={CalendarClock}
          label="Planung"
          title={
            planning.gapSlots > 0
              ? `${planning.gapSlots} offene Zeitfenster`
              : "Woche gut abgedeckt"
          }
          description={
            planning.gapSlots > 0
              ? `${planning.fillPercent} % der Fenster erfüllen die Mindestbesetzung (2 Personen).`
              : `Zyklus-Woche ${focusWeek}: Mindestbesetzung in allen Fenstern erreicht.`
          }
          href={`/dashboard/planning?focusWeek=${focusWeek}`}
          cta={planning.gapSlots > 0 ? "Jetzt planen" : "Planer öffnen"}
        />

        <FocusCard
          tone={approvalsTone}
          icon={ClipboardList}
          label="Freigaben"
          title={
            approvals.total > 0
              ? `${approvals.total} offen`
              : "Alles freigegeben"
          }
          description={
            approvals.total > 0
              ? [
                  approvals.vacations > 0 ? `${approvals.vacations} Urlaub/Abwesenheit` : null,
                  approvals.corrections > 0 ? `${approvals.corrections} Zeitkorrektur` : null,
                  approvals.trades > 0 ? `${approvals.trades} Schicht-Tausch` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Keine wartenden Anträge — du kannst planen oder auswerten."
          }
          href={approvals.primaryHref}
          cta={approvals.primaryCta}
        />
      </div>
    </section>
  );
}
