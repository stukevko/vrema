import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type DashboardPageHeaderVariant = "plain" | "card" | "hero";

type Props = {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  badge?: ReactNode;
  variant?: DashboardPageHeaderVariant;
  className?: string;
};

/**
 * Einheitliche Seitenköpfe — gleiche Typografie wie Cockpit & Planung.
 * plain: Team/Partner · card: Insights/Settings · hero: Planung/Billing
 */
export function DashboardPageHeader({
  title,
  description,
  eyebrow,
  icon: Icon,
  actions,
  badge,
  variant = "card",
  className,
}: Props) {
  if (variant === "plain") {
    return (
      <header className={clsx("min-w-0", className)}>
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand">{eyebrow}</p>
        ) : null}
        <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
        {badge ? <div className="mt-3">{badge}</div> : null}
        {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
      </header>
    );
  }

  if (variant === "hero") {
    return (
      <header
        className={clsx(
          "glass-card relative overflow-hidden px-4 py-4 sm:flex sm:items-start sm:justify-between sm:gap-4 sm:px-5 sm:py-5",
          className,
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/15"
        />
        <div className="relative min-w-0">
          {eyebrow ? (
            <p className="text-[10px] font-semibold uppercase tracking-widest text-brand">{eyebrow}</p>
          ) : null}
          <h1 className="mt-1 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{title}</h1>
          {description ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
          {badge ? <div className="mt-3">{badge}</div> : null}
        </div>
        {actions ? <div className="relative mt-3 shrink-0 sm:mt-0">{actions}</div> : null}
      </header>
    );
  }

  return (
    <header
      className={clsx(
        "rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] dark:border-white/10 sm:p-5",
        Icon ? "flex items-start gap-3 sm:gap-4" : "",
        className,
      )}
    >
      {Icon ? (
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-brand-soft text-brand dark:border-white/10 dark:bg-brand/25">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand">{eyebrow}</p>
        ) : null}
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1.5 text-sm text-muted-foreground">{description}</p> : null}
        {badge ? <div className="mt-3">{badge}</div> : null}
      </div>
      {actions ? <div className="mt-3 shrink-0 sm:mt-0">{actions}</div> : null}
    </header>
  );
}
