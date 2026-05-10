import * as React from "react";
import clsx from "clsx";

/**
 * Eine konsistente Status-Pille für ALLE Status-Anzeigen in VREMA.
 * Statt Ad-hoc-Tailwind-Farben pro Seite (grün-bg-100 hier, lila-text-700 dort)
 * gibt es genau diese sechs Töne, gemappt auf die Theme-Tokens.
 *
 * Tone → Bedeutung:
 *  - success  : Pünktlich, Freigegeben, Schicht aktiv, OK
 *  - warning  : Zu spät, Urlaub, Achtung, Pending
 *  - danger   : Krank, Abgelehnt, Fehlend, Fehler
 *  - neutral  : Frei, Standard, Keine Info
 *  - brand    : Hervorhebung im Petrol (z. B. "Aktiv")
 *  - info     : Hinweis (gedämpftes Schiefergrau – Alias für neutral, aber mit Punkt)
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
  className?: string;
  children: React.ReactNode;
};

export function StatusBadge({
  tone = "neutral",
  size = "md",
  withDot = true,
  className,
  children,
}: StatusBadgeProps): React.JSX.Element {
  return (
    <span
      className={clsx(
        "inline-flex items-center font-medium tracking-tight",
        "rounded-full border",
        sizes[size],
        tones[tone],
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
