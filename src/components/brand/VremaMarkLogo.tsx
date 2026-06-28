import * as React from "react";
import clsx from "clsx";
import { VREMA_BRAND } from "@/lib/brand/assets";

type Variant = "glyph" | "tile" | "brand";

type VremaMarkLogoProps = {
  size?: number;
  variant?: Variant;
  subtleHighlight?: boolean;
  title?: string;
  className?: string;
};

export const VREMA_DEEP_PETROL = "#0a3a52";

/** Kreis-V aus den Brand-PNGs — scharf, Light/Dark automatisch. */
export function VremaMarkLogo({
  size = 40,
  variant = "glyph",
  title = "VREMA",
  className,
}: VremaMarkLogoProps): React.JSX.Element {
  const useBrandPng = variant === "tile" || variant === "brand";

  if (useBrandPng) {
    return (
      <span className={clsx("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={VREMA_BRAND.markLight}
          alt={title}
          width={size}
          height={size}
          className="h-full w-full object-contain dark:hidden"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={VREMA_BRAND.markDark}
          alt={title}
          width={size}
          height={size}
          className="hidden h-full w-full object-contain dark:block"
        />
      </span>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      shapeRendering="geometricPrecision"
      className={clsx(
        "shrink-0 text-[#0a3a52] dark:text-white",
        "dark:drop-shadow-[0_1px_6px_rgba(14,146,206,0.18)]",
        className,
      )}
    >
      <title>{title}</title>
      <path
        d="M14 12 L32 50 L50 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeMiterlimit="6"
      />
    </svg>
  );
}

export function VremaLockup({
  size = 32,
  className,
  variant = "tile",
  tagline,
}: {
  size?: number;
  variant?: Variant;
  className?: string;
  tagline?: string;
}): React.JSX.Element {
  return (
    <span className={clsx("inline-flex items-center gap-x-2.5", className)}>
      <VremaMarkLogo size={size} variant={variant} />
      <span className="flex min-w-0 flex-col leading-none">
        <span className="font-bold tracking-tighter" style={{ fontSize: Math.round(size * 0.62) }}>
          VREMA
        </span>
        {tagline ? (
          <span
            className="mt-1 font-medium uppercase text-fg-muted opacity-80"
            style={{ fontSize: Math.max(9, Math.round(size * 0.24)), letterSpacing: "0.16em" }}
          >
            {tagline}
          </span>
        ) : null}
      </span>
    </span>
  );
}

export function VremaWordmark({
  size = 24,
  className,
  title = "VREMA",
}: {
  size?: number;
  className?: string;
  title?: string;
}): React.JSX.Element {
  return (
    <span
      role="img"
      aria-label={title}
      className={clsx("inline-flex select-none items-baseline font-bold tracking-tighter", className)}
      style={{ fontSize: size, lineHeight: 1 }}
    >
      VREMA
    </span>
  );
}

/** Marketing-Logo: scharfes horizontales Lockup (Kreis + VREMA), nav-tauglich skaliert. */
export function VremaLandingLogo({
  size = 44,
  className,
  tagline,
  /** Immer helle Marke — z. B. dunkler Footer unabhängig vom Theme. */
  onDark = false,
}: {
  size?: number;
  className?: string;
  tagline?: string;
  onDark?: boolean;
}): React.JSX.Element {
  if (onDark) {
    return (
      <span className={clsx("inline-flex items-center gap-x-2.5", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={VREMA_BRAND.markDark}
          alt=""
          aria-hidden
          className="block shrink-0 object-contain"
          style={{ width: size, height: size }}
        />
        <span className="flex min-w-0 flex-col justify-center leading-none">
          <span className="font-bold tracking-tighter text-white" style={{ fontSize: Math.round(size * 0.62) }}>
            VREMA
          </span>
          {tagline ? (
            <span
              className="mt-1 font-medium uppercase text-white/70"
              style={{ fontSize: Math.max(9, Math.round(size * 0.24)), letterSpacing: "0.16em" }}
            >
              {tagline}
            </span>
          ) : null}
        </span>
      </span>
    );
  }

  return (
    <VremaLockup
      size={size}
      variant="tile"
      tagline={tagline}
      className={clsx("items-center text-foreground", className)}
    />
  );
}
