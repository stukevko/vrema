import type { ReactNode } from "react";
import { CalendarClock, Coffee } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Inbox } from "lucide-react";

export type EmployeeShiftListItem = {
  id: string;
  dateLine: string;
  timeLine: string;
  slotLabel?: string;
  weekLabel?: string;
  isPast: boolean;
  isNext?: boolean;
  isOpenForTrade: boolean;
  breakMinutes?: number;
};

type Props = {
  title: string;
  items: EmployeeShiftListItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  renderTradeAction?: (item: EmployeeShiftListItem) => ReactNode;
};

export function EmployeeShiftList({
  title,
  items,
  emptyTitle = "Noch keine Schichten",
  emptyDescription = "Sobald dich dein Team einplant, erscheinen deine Termine hier.",
  renderTradeAction,
}: Props) {
  return (
    <section className="glass-card overflow-hidden p-4 sm:p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>

      {items.length === 0 ? (
        <EmptyState className="mt-4" icon={Inbox} title={emptyTitle} description={emptyDescription} />
      ) : (
        <ol className="relative mt-5 space-y-0">
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-2 left-[1.125rem] top-2 w-px bg-gradient-to-b from-brand/40 via-border to-transparent"
          />
          {items.map((item) => (
            <li key={item.id} className="relative pl-10 pb-4 last:pb-0">
              <span
                aria-hidden
                className={`absolute left-2 top-3 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  item.isPast
                    ? "border-muted-foreground/30 bg-muted"
                    : item.isNext
                      ? "border-brand bg-brand shadow-[0_0_0_3px_hsl(var(--brand-soft))]"
                      : "border-brand/50 bg-surface"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${item.isPast ? "bg-muted-foreground/40" : "bg-brand"}`}
                />
              </span>

              <article
                className={`rounded-2xl border p-4 transition-shadow ${
                  item.isPast
                    ? "border-line/50 bg-muted/20 opacity-85"
                    : item.isNext
                      ? "border-brand/35 bg-gradient-to-br from-brand-soft/90 to-surface shadow-[var(--shadow-card)] dark:from-brand/20 dark:to-surface/90"
                      : "border-line bg-surface shadow-sm dark:border-white/10 dark:bg-surface/90"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{item.dateLine}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {item.slotLabel ? (
                        <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {item.slotLabel}
                        </span>
                      ) : null}
                      {item.weekLabel ? (
                        <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {item.weekLabel}
                        </span>
                      ) : null}
                      {item.isPast ? (
                        <span className="text-[10px] font-medium text-muted-foreground">vergangen</span>
                      ) : item.isNext ? (
                        <StatusBadge tone="brand" glass size="sm" withDot={false}>
                          Als Nächstes
                        </StatusBadge>
                      ) : null}
                    </div>
                  </div>
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-brand-soft text-brand dark:border-white/10 dark:bg-brand/25">
                    <CalendarClock className="h-4 w-4" aria-hidden />
                  </span>
                </div>

                <p className="mt-3 font-sans text-2xl font-extrabold tabular-nums tracking-tight text-brand">
                  {item.timeLine}
                </p>

                {(item.breakMinutes ?? 0) > 0 ? (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Coffee className="h-3.5 w-3.5" aria-hidden />
                    Pause {item.breakMinutes} Min
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {item.isOpenForTrade ? (
                    <StatusBadge tone="warning" glass size="sm" withDot={false}>
                      Zum Tausch angeboten
                    </StatusBadge>
                  ) : null}
                  {renderTradeAction?.(item)}
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
