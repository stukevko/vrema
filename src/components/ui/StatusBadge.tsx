import * as React from "react";
import clsx from "clsx";

/**
 * Eine konsistente Status-Pille für ALLE Status-Anzeigen in VREMA.
 * `glass`: halbtransparent + backdrop-blur (Apple-Glas über Statusfarbe).
 */
export type StatusTone = "success" | "warning" | "danger" | "neutral" | "brand" | "info";

const tones: Record<StatusTone, string> = {
  success: "bg-success-soft text-success-foreground border-success/20",
  warning: "bg-warning-soft text-warning-foreground border-warning/25",
  danger: "bg-danger-soft text-danger-foreground border-danger/25",
  neutral: "bg-neutral-soft text-neutral-foreground border-line",
  brand: "bg-brand-soft text-brand border-brand/20",
  info: "bg-surface-muted text-fg-muted border-line",
};

/**
 * "Glass"-Variante – keine echten backdrop-filter (Performance!),
 * sondern eine sattere Tönung mit dünner Specular-Kante (Apple iOS Pille).
 */
const glassTones: Record<StatusTone, string> = {
  success:
    "border-success/20 bg-success-soft text-success-foreground shadow-sm dark:border-white/10 dark:bg-success/25",
  warning:
    "border-warning/20 bg-warning-soft text-warning-foreground shadow-sm dark:border-white/10 dark:bg-warning/22",
  danger:
    "border-danger/20 bg-danger-soft text-danger-foreground shadow-sm dark:border-white/10 dark:bg-danger/22",
  neutral:
    "border-line bg-neutral-soft/95 text-neutral-foreground shadow-sm dark:border-white/10 dark:bg-neutral-soft/45",
  brand:
    "border-brand/25 bg-brand-soft text-brand shadow-sm dark:border-white/10 dark:bg-brand/20 dark:text-brand",
  info: "border-line bg-surface-muted/95 text-fg-muted shadow-sm dark:border-white/10 dark:bg-surface-muted/55",
};

const dotTones: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-neutral-tone",
  brand: "bg-brand",
  info: "bg-fg-subtle",
};

type Size = "sm" | "md";

const sizes: Record<Size, string> = {
  sm: "px-2 py-0.5 text-xs gap-1.5",
  md: "px-2.5 py-1 text-xs gap-2",
};

type StatusBadgeProps = {
  tone?: StatusTone;
  size?: Size;
  withDot?: boolean;
  /** Halbtransparentes Glas über der Statusfarbe */
  glass?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function StatusBadge({
  tone = "neutral",
  size = "md",
  withDot = true,
  glass = false,
  className,
  children,
}: StatusBadgeProps): React.JSX.Element {
  return (
    <span
      className={clsx(
        "inline-flex items-center font-medium tracking-tight",
        "rounded-full border",
        sizes[size],
        glass ? glassTones[tone] : tones[tone],
        className,
      )}
    >
      {withDot && (
        <span
          className={clsx("inline-block h-1.5 w-1.5 rounded-full", dotTones[tone])}
          aria-hidden
        />
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}
