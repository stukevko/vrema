import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Einheitliche Dashboard-Fläche — glossy Specular (Light/Dark via CSS-Tokens). */
export const dashboardSurfaceClass = "glossy-surface rounded-3xl";

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
      ? "glossy-surface glossy-surface--brand rounded-3xl"
      : tone === "muted"
        ? "glossy-surface glossy-surface--muted rounded-3xl"
        : tone === "alert"
          ? "glossy-surface glossy-surface--alert rounded-3xl"
          : dashboardSurfaceClass;

  const paddingClass =
    padding === "none" ? "" : padding === "comfortable" ? "p-5 sm:p-8" : "p-4 sm:p-5";

  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={clsx(surface, paddingClass, "dashboard-surface-mobile min-w-0 max-w-full", className)}
    >
      {!bare && (title || description || Icon) ? (
        <div className="dashboard-card-row dashboard-card-row--split mb-4">
          <div className="dashboard-card-row__content">
            {title ? (
              <div className="flex items-center gap-2">
                {Icon ? <Icon className="h-4 w-4 shrink-0 text-brand" aria-hidden /> : null}
                <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
              </div>
            ) : null}
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {headerAction ? <div className="dashboard-card-row__aside">{headerAction}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
