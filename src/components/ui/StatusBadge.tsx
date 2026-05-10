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

/** Glasmorphism-Overlay – Specular-Kante, keine grellen Vollflächen */
const glassTones: Record<StatusTone, string> = {
  success:
    "backdrop-blur-md border-white/30 bg-brand/16 text-brand shadow-sm dark:border-white/10 dark:bg-brand/22 dark:text-brand-foreground",
  warning:
    "backdrop-blur-md border-white/28 bg-warning/14 text-warning-foreground shadow-sm dark:border-white/10 dark:bg-warning/20",
  danger:
    "backdrop-blur-md border-white/28 bg-danger/14 text-danger-foreground shadow-sm dark:border-white/10 dark:bg-danger/22",
  neutral:
    "backdrop-blur-md border-white/35 bg-neutral-soft/85 text-neutral-foreground shadow-sm dark:border-white/10 dark:bg-neutral-soft/35",
  brand:
    "backdrop-blur-md border-white/30 bg-brand/18 text-brand shadow-sm dark:border-white/10 dark:bg-brand/26 dark:text-brand-foreground",
  info: "backdrop-blur-md border-white/25 bg-surface-muted/90 text-fg-muted shadow-sm dark:border-white/10 dark:bg-surface-muted/45",
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
  sm: "px-2 py-0.5 text-[11px] gap-1.5",
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
