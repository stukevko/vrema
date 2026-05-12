import * as React from "react";
import clsx from "clsx";

type Variant = "brand" | "outline" | "ghost" | "danger" | "warning" | "subtle";
type Size = "sm" | "md" | "lg";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  /** Extra Petrol-Glow – für Hero-CTAs (z. B. Autopilot). */
  hero?: boolean;
};

const base =
  "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap " +
  "rounded-xl border " +
  "transition-[filter,box-shadow,background-color,border-color,color] duration-200 ease-out " +
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 " +
  "active:brightness-95 " +
  "disabled:opacity-55 disabled:cursor-not-allowed";

/**
 * Apple-Style: keine farbigen Halos, kein hover-scale (kosmetisch teuer + visuell unruhig).
 * Tiefe entsteht aus gestaffelten neutralen Schatten + sehr dünner Specular-Kante.
 */
const variants: Record<Variant, string> = {
  brand:
    "bg-gradient-to-b from-brand to-brand-hover text-brand-foreground " +
    "border-white/25 " +
    "shadow-[inset_0_1px_0_0_hsl(var(--specular-line)/0.48),inset_0_-1px_0_0_hsl(0_0%_0%/0.12),var(--shadow-button)] " +
    "dark:border-white/12 dark:shadow-[inset_0_1px_0_0_hsl(var(--specular-line)/0.22),inset_0_-1px_0_0_hsl(0_0%_0%/0.35),var(--shadow-button)] " +
    "hover:brightness-[1.05] hover:shadow-[inset_0_1px_0_0_hsl(var(--specular-line)/0.52),inset_0_-1px_0_0_hsl(0_0%_0%/0.1),var(--shadow-button-hover)] " +
    "dark:hover:shadow-[inset_0_1px_0_0_hsl(var(--specular-line)/0.28),inset_0_-1px_0_0_hsl(0_0%_0%/0.38),var(--shadow-button-hover)]",
  outline:
    "border-line-strong/80 bg-surface/95 text-fg shadow-sm " +
    "dark:border-white/10 dark:bg-surface/65 " +
    "hover:border-brand/45 hover:bg-surface-muted hover:text-brand",
  ghost:
    "border-transparent bg-transparent text-fg-muted " +
    "hover:bg-surface-muted/80 hover:text-fg",
  subtle:
    "border-brand/15 bg-brand-soft/95 text-brand shadow-sm " +
    "dark:border-white/10 dark:bg-brand-soft/80 " +
    "hover:bg-brand/12",
  danger:
    "bg-gradient-to-b from-danger to-danger text-white border-white/15 " +
    "shadow-[var(--shadow-button)] dark:border-white/10 " +
    "hover:brightness-[1.06] hover:shadow-[var(--shadow-button-hover)]",
  warning:
    "bg-gradient-to-b from-warning to-warning text-white border-white/15 " +
    "shadow-[var(--shadow-button)] dark:border-white/10 " +
    "hover:brightness-[1.06] hover:shadow-[var(--shadow-button-hover)]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "brand",
    size = "md",
    fullWidth,
    loading,
    disabled,
    leadingIcon,
    trailingIcon,
    hero,
    children,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        base,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        hero &&
          variant === "brand" &&
          "shadow-[var(--shadow-button-hover),0_0_36px_-12px_hsl(var(--brand)_/_0.5)]",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : (
        leadingIcon && <span className="-ml-0.5 flex shrink-0 items-center">{leadingIcon}</span>
      )}
      <span className="truncate">{children}</span>
      {trailingIcon && !loading && (
        <span className="-mr-0.5 flex shrink-0 items-center">{trailingIcon}</span>
      )}
    </button>
  );
});
