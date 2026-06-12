import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Einheitliche Dashboard-Fläche — Marketing-Nähe (rounded-3xl, ein Schatten). */
export const dashboardSurfaceClass =
  "rounded-3xl border border-border bg-card shadow-[var(--shadow-card)] dark:border-white/10";

type Props = {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  tone?: "default" | "brand" | "muted" | "alert";
  className?: string;
  id?: string;
  headerAction?: ReactNode;
  /** Nur Fläche, kein Header-Block. */
  bare?: boolean;
  padding?: "default" | "comfortable" | "none";
  ariaLabel?: string;
};

/** Standard-Sektion im Dashboard — eine Kartenform für alle Bereiche. */
export function DashboardSectionCard({
  title,
  description,
  icon: Icon,
  children,
  tone = "default",
  className,
  id,
  headerAction,
  bare = false,
  padding = "default",
  ariaLabel,
}: Props) {
  const surface =
    tone === "brand"
      ? "border-brand/20 bg-brand-soft/30 dark:border-white/10 dark:bg-brand/10"
      : tone === "muted"
        ? "border-line bg-surface-muted/60 dark:border-white/10"
        : tone === "alert"
          ? "border-warning/30 bg-warning-soft/35 dark:border-white/10 dark:bg-warning/10"
          : dashboardSurfaceClass;

  const paddingClass =
    padding === "none" ? "" : padding === "comfortable" ? "p-5 sm:p-8" : "p-4 sm:p-5";

  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={clsx(surface, paddingClass, "dashboard-surface-mobile max-md:shadow-none", className)}
    >
      {!bare && (title || description || Icon) ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <div className="flex items-center gap-2">
                {Icon ? <Icon className="h-4 w-4 shrink-0 text-brand" aria-hidden /> : null}
                <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
              </div>
            ) : null}
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {headerAction}
        </div>
      ) : null}
      {children}
    </section>
  );
}
