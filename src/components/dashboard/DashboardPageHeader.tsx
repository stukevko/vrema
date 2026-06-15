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
  /** Mobil: Titel steht in der Topbar — kein doppelter Seitenkopf. */
  hideOnMobile?: boolean;
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
  hideOnMobile = false,
}: Props) {
  const mobileHidden = hideOnMobile ? "max-md:hidden" : "";

  if (variant === "plain") {
    return (
      <header className={clsx("min-w-0", mobileHidden, className)}>
        {eyebrow ? (
          <p className="text-xs font-medium text-brand">{eyebrow}</p>
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
          "glass-card relative overflow-hidden px-3 py-3 sm:flex sm:items-start sm:justify-between sm:gap-4 sm:px-5 sm:py-5",
          mobileHidden,
          className,
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/15"
        />
        <div className="relative min-w-0">
          {eyebrow ? (
            <p className="text-xs font-medium text-brand">{eyebrow}</p>
          ) : null}
          <h1 className="mt-1 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{title}</h1>
          {description ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
          {badge ? <div className="mt-3">{badge}</div> : null}
        </div>
        {actions ? (
          <div className="dashboard-card-row__aside relative mt-0 flex-row flex-wrap sm:mt-0">{actions}</div>
        ) : null}
      </header>
    );
  }

  return (
    <header
      className={clsx(
        "glossy-surface min-w-0 max-w-full rounded-2xl p-4 sm:rounded-3xl sm:p-5",
        Icon ? "flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4" : "",
        mobileHidden,
        className,
      )}
    >
      {Icon ? (
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl glossy-surface border-0 bg-brand-soft/80 text-brand dark:bg-brand/20">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className="text-xs font-medium text-brand">{eyebrow}</p>
        ) : null}
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1.5 text-sm text-muted-foreground">{description}</p> : null}
        {badge ? <div className="mt-3">{badge}</div> : null}
      </div>
      {actions ? (
        <div className="dashboard-card-row__aside mt-0 flex-row flex-wrap sm:mt-0">{actions}</div>
      ) : null}
    </header>
  );
}
