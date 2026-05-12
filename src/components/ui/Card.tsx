import * as React from "react";
import clsx from "clsx";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  as?: keyof React.JSX.IntrinsicElements;
  padded?: boolean;
  hoverable?: boolean;
};

/**
 * Standard-Karte für VREMA.
 * Hintergrund: surface • Rand: line • Schatten aus Token (--shadow-card).
 * `hoverable`: subtile Hebung + sanfte Animation (für klickbare Karten).
 */
export function Card({
  className,
  as,
  padded = true,
  hoverable = false,
  children,
  ...rest
}: CardProps): React.JSX.Element {
  const Comp = (as ?? "div") as React.ElementType;
  return (
    <Comp
      className={clsx(
        "rounded-2xl border border-line/90 bg-surface/92 text-fg",
        "shadow-[var(--shadow-card)]",
        "backdrop-blur-xl supports-[backdrop-filter]:bg-surface/78",
        "dark:border-white/10 dark:bg-surface/75 dark:supports-[backdrop-filter]:bg-surface/65",
        "transition-[box-shadow,border-color,background-color] duration-200",
        hoverable && "hover:shadow-[var(--shadow-card-hover)] hover:border-brand/30",
        padded && "p-5 sm:p-6",
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}

type SectionTitleProps = {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export function SectionTitle({
  eyebrow,
  title,
  description,
  action,
  className,
}: SectionTitleProps): React.JSX.Element {
  return (
    <div className={clsx("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
            {eyebrow}
          </div>
        )}
        <h2 className="text-base font-semibold tracking-tight text-fg sm:text-lg md:text-xl">{title}</h2>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
