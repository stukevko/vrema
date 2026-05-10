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
};

const base =
  "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap " +
  "rounded-xl border transition-all duration-200 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 " +
  "disabled:opacity-55 disabled:cursor-not-allowed disabled:hover:translate-y-0";

const variants: Record<Variant, string> = {
  brand:
    "bg-brand text-brand-foreground border-brand shadow-sm " +
    "hover:bg-brand-hover hover:-translate-y-px hover:shadow-md " +
    "active:translate-y-0",
  outline:
    "bg-surface text-fg border-line-strong shadow-sm " +
    "hover:bg-surface-muted hover:border-brand/50 hover:text-brand",
  ghost:
    "bg-transparent text-fg-muted border-transparent " +
    "hover:bg-surface-muted hover:text-fg",
  subtle:
    "bg-brand-soft text-brand border-transparent " +
    "hover:bg-brand/15",
  danger:
    "bg-danger text-white border-danger shadow-sm " +
    "hover:bg-danger/90 hover:-translate-y-px hover:shadow-md",
  warning:
    "bg-warning text-white border-warning shadow-sm " +
    "hover:bg-warning/90 hover:-translate-y-px hover:shadow-md",
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
      className={clsx(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
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
