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
  "rounded-xl border transition-all duration-200 " +
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 " +
  "disabled:opacity-55 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100";

const variants: Record<Variant, string> = {
  brand:
    "relative overflow-hidden bg-gradient-to-b from-brand via-brand to-brand-hover text-brand-foreground " +
    "border-white/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22),0_8px_26px_-6px_hsl(var(--brand)_/_0.42)] " +
    "dark:border-white/12 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_10px_32px_-8px_hsl(var(--brand)_/_0.52)] " +
    "hover:brightness-[1.06] hover:-translate-y-px hover:scale-[1.02] " +
    "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.28),0_14px_38px_-8px_hsl(var(--brand)_/_0.52)] " +
    "active:translate-y-0 active:scale-[0.99] active:brightness-[0.97]",
  outline:
    "border-line-strong/90 bg-surface/90 text-fg backdrop-blur-md " +
    "shadow-[inset_0_1px_0_0_hsl(var(--specular-line)_/_0.35)] " +
    "dark:border-white/12 dark:bg-surface/55 " +
    "hover:border-brand/45 hover:bg-surface-muted hover:text-brand hover:scale-[1.02]",
  ghost:
    "border-transparent bg-transparent text-fg-muted " +
    "hover:bg-surface-muted/80 hover:text-fg hover:scale-[1.02]",
  subtle:
    "border-white/15 bg-brand-soft/95 text-brand backdrop-blur-sm dark:border-white/10 dark:bg-brand-soft/80 " +
    "shadow-sm hover:bg-brand/15 hover:scale-[1.02]",
  danger:
    "bg-gradient-to-b from-danger to-danger text-white border-white/15 " +
    "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18),0_6px_20px_-4px_hsl(var(--danger)_/_0.45)] " +
    "hover:brightness-110 hover:-translate-y-px hover:scale-[1.02] active:translate-y-0",
  warning:
    "bg-gradient-to-b from-warning to-warning text-white border-white/15 " +
    "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18),0_6px_20px_-4px_hsl(var(--warning)_/_0.35)] " +
    "hover:brightness-110 hover:-translate-y-px hover:scale-[1.02] active:translate-y-0",
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
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.24),0_0_52px_-14px_hsl(var(--brand)_/_0.65),0_12px_36px_-10px_hsl(var(--brand)_/_0.55)]",
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
