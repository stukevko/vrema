import clsx from "clsx";

type SkeletonProps = {
  className?: string;
  /** Runde Ecken (Standard: abgerundet wie Karten-Inhalt) */
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";
};

const ROUNDED: Record<NonNullable<SkeletonProps["rounded"]>, string> = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
};

/**
 * Pulsierender Platzhalter für Ladezustände (kein Radix nötig – reines Tailwind).
 */
export function Skeleton({ className, rounded = "lg" }: SkeletonProps) {
  return (
    <div
      className={clsx(
        "animate-pulse bg-muted/60 dark:bg-muted/35",
        ROUNDED[rounded],
        className,
      )}
      aria-hidden
    />
  );
}
