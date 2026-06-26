import * as React from "react";
import clsx from "clsx";
import { VREMA_BRAND } from "@/lib/brand/assets";

type Variant = "glyph" | "tile";

type VremaMarkLogoProps = {
  /** Pixelgröße (Breite/Höhe). Default: 40. */
  size?: number;
  /** `glyph` und `tile` nutzen dasselbe quadratische Icon-Asset. */
  variant?: Variant;
  /** Unbenutzt — bleibt für API-Kompatibilität. */
  subtleHighlight?: boolean;
  title?: string;
  className?: string;
};

/** Tiefes Petrol — Theme-Farbe, falls noch als CSS-Referenz gebraucht. */
export const VREMA_DEEP_PETROL = "#0a3a52";

export function VremaMarkLogo({
  size = 40,
  title = "VREMA",
  className,
}: VremaMarkLogoProps): React.JSX.Element {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Brand-Asset aus /public
    <img
      src={VREMA_BRAND.icon}
      alt={title}
      width={size}
      height={size}
      className={clsx("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** Horizontales VREMA-Logo (PNG-Lockup). */
export function VremaLockup({
  size = 32,
  className,
  tagline,
}: {
  size?: number;
  variant?: Variant;
  className?: string;
  tagline?: string;
}): React.JSX.Element {
  return (
    <span className={clsx("inline-flex min-w-0 flex-col items-start gap-1", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={VREMA_BRAND.logo}
        alt="VREMA"
        className="w-auto max-w-full object-contain object-left"
        style={{ height: size }}
      />
      {tagline ? (
        <span
          className="font-medium uppercase text-fg-muted opacity-80"
          style={{ fontSize: Math.max(9, Math.round(size * 0.24)), letterSpacing: "0.16em" }}
        >
          {tagline}
        </span>
      ) : null}
    </span>
  );
}

/** Reine Wortmarke — Fallback wenn nur Text passt. */
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
