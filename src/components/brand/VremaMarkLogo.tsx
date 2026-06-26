import * as React from "react";
import clsx from "clsx";

/**
 * VREMA – Corporate Mark.
 *
 * Design-Grundsätze (Geometric Authority):
 * - Keine Verläufe innerhalb der Pfade.
 * - Stroke-V mit `square`-Linecap und `miter`-Linejoin (keine weichen Ecken).
 * - Mittelfette Stroke-Width (≈ 14 % des Viewports) – stabil, nicht kindisch.
 * - Tile-Variante: exaktes Rechteck, keine abgerundeten Ecken.
 * - Light: tiefes, fast schwarzes Petrol-Blau.
 * - Dark: weißes V mit sehr dezentem Petrol-Drop-Shadow (kein "Glühen").
 */

type Variant = "glyph" | "tile";

type VremaMarkLogoProps = {
  /** Pixelgröße (Breite/Höhe). Default: 40. */
  size?: number;
  /**
   * - `glyph` (Default): nur das V, folgt `currentColor` (Light = Deep Petrol, Dark = Weiß).
   * - `tile`: Dunkler Petrol-Block + weißes V – für Favicons, App-Icons, Eingangskacheln.
   */
  variant?: Variant;
  /** Optional: minimaler Top-Down-Highlight im Tile (≤ 4 %). */
  subtleHighlight?: boolean;
  title?: string;
  className?: string;
};

/** Tiefes Petrol-Blau – fast schwarz, hohe Autorität. */
export const VREMA_DEEP_PETROL = "#0a3a52";

export function VremaMarkLogo({
  size = 40,
  variant = "glyph",
  subtleHighlight = true,
  title = "VREMA",
  className,
}: VremaMarkLogoProps): React.JSX.Element {
  const uid = React.useId().replace(/[:]/g, "");
  const gradId = `vrema-tile-${uid}`;

  if (variant === "glyph") {
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
        {/* Dark-Mode: hauchdünne weiße Lichtkante, damit sich das V vom Schwarz absetzt */}
        <path
          d="M14 12 L32 50 L50 12"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.05"
          strokeWidth="13"
          strokeLinecap="square"
          strokeLinejoin="miter"
          strokeMiterlimit="6"
          className="opacity-0 dark:opacity-100"
        />
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

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      shapeRendering="geometricPrecision"
      className={clsx("shrink-0", className)}
    >
      <title>{title}</title>

      {/* Solider Petrol-Block – exakte 90°-Ecken */}
      <rect x="0" y="0" width="64" height="64" fill={VREMA_DEEP_PETROL} />

      {/* Optional: extrem subtiler vertikaler Top-Down-Verlauf (≤ 4 %) */}
      {subtleHighlight && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.045" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="64" height="64" fill={`url(#${gradId})`} />
        </>
      )}

      {/* Dark-Mode-Edge: hauchdünne weiße Outline, damit sich der Block absetzt */}
      <rect
        x="0.5"
        y="0.5"
        width="63"
        height="63"
        fill="none"
        className="stroke-transparent dark:stroke-white/10"
        strokeWidth="1"
      />

      {/* V – geometrisch, Strich mittel-fett, square caps, miter joins */}
      <path
        d="M14 12 L32 50 L50 12"
        fill="none"
        stroke="#ffffff"
        strokeWidth="9"
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeMiterlimit="6"
      />
    </svg>
  );
}

/**
 * Symbol + Wortmarke. Items-center, präziser gap-x-3, font-bold tracking-tighter.
 */
export function VremaLockup({
  size = 32,
  className,
  variant = "glyph",
  tagline,
}: {
  size?: number;
  variant?: Variant;
  className?: string;
  tagline?: string;
}): React.JSX.Element {
  return (
    <span className={clsx("inline-flex items-center gap-x-3", className)}>
      <VremaMarkLogo size={size} variant={variant} />
      <span className="flex min-w-0 flex-col leading-none">
        <span
          className="font-bold tracking-tighter"
          style={{ fontSize: Math.round(size * 0.62) }}
        >
          VREMA
        </span>
        {tagline && (
          <span
            className="mt-1 font-medium uppercase text-fg-muted opacity-80"
            style={{ fontSize: Math.max(9, Math.round(size * 0.24)), letterSpacing: "0.16em" }}
          >
            {tagline}
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * Reine Wortmarke – font-bold, tracking-tighter, currentColor.
 */
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
