import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  tone?: "default" | "brand" | "muted";
  className?: string;
  id?: string;
  headerAction?: ReactNode;
};

/** Standard-Sektion auf Settings, Konto, Urlaub, Super-Admin. */
export function DashboardSectionCard({
  title,
  description,
  icon: Icon,
  children,
  tone = "default",
  className,
  id,
  headerAction,
}: Props) {
  const surface =
    tone === "brand"
      ? "border-brand/25 bg-brand-soft/40 dark:border-white/10 dark:bg-brand/12"
      : tone === "muted"
        ? "border-line bg-surface-muted/50 dark:border-white/10"
        : "border-border bg-card shadow-[var(--shadow-card)] dark:border-white/10";

  return (
    <section id={id} className={clsx("rounded-2xl border p-4 sm:p-5", surface, className)}>
      {title || description || Icon ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <div className="flex items-center gap-2">
                {Icon ? <Icon className="h-4 w-4 shrink-0 text-brand" aria-hidden /> : null}
                <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-foreground">
                  {title}
                </h2>
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
