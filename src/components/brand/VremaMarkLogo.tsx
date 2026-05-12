import * as React from "react";
import clsx from "clsx";

type Variant = "glass" | "flat" | "mono";

type VremaMarkLogoProps = {
  /** Pixelgröße (Breite/Höhe). Default: 40. */
  size?: number;
  /**
   * - `glass` (Default): Premium-Glas mit Petrol-Gradient + Specular-Glanz (Apple iOS-Style).
   * - `flat`: einfarbiger Petrol-Squircle, ideal für Drucke und kleine Größen.
   * - `mono`: nimmt `currentColor` (z. B. weiß auf dunklem Hintergrund, Petrol auf Light).
   */
  variant?: Variant;
  /** Sichtbare Bezeichnung – für a11y. */
  title?: string;
  className?: string;
};

/**
 * VREMA-Markenzeichen: Squircle als "Zifferblatt", weißes „V" als stilisierter Uhrzeiger,
 * Pivot-Dot an der V-Spitze. Skaliert vektorscharf, dark/light-fähig via Brand-Tokens.
 */
export function VremaMarkLogo({
  size = 40,
  variant = "glass",
  title = "VREMA",
  className,
}: VremaMarkLogoProps): React.JSX.Element {
  const uid = React.useId().replace(/[:]/g, "");
  const gradId = `vrema-grad-${uid}`;
  const specId = `vrema-spec-${uid}`;
  const innerId = `vrema-inner-${uid}`;
  const clipId = `vrema-clip-${uid}`;

  const isMono = variant === "mono";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={clsx("shrink-0", className)}
    >
      <title>{title}</title>
      <defs>
        {variant === "glass" && (
          <>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              {/* Top-Highlight: hellerer Petrol */}
              <stop offset="0%" stopColor="hsl(199 92% 60%)" />
              <stop offset="55%" stopColor="hsl(199 92% 44%)" />
              <stop offset="100%" stopColor="hsl(199 92% 32%)" />
            </linearGradient>
            <linearGradient id={specId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.06)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            <radialGradient id={innerId} cx="50%" cy="0%" r="80%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </>
        )}
        <clipPath id={clipId}>
          <rect x="2" y="2" width="60" height="60" rx="15" ry="15" />
        </clipPath>
      </defs>

      {/* Glas-Squircle */}
      {variant === "glass" && (
        <>
          <rect x="2" y="2" width="60" height="60" rx="15" ry="15" fill={`url(#${gradId})`} />
          {/* Specular-Glow oben */}
          <rect
            x="2"
            y="2"
            width="60"
            height="60"
            rx="15"
            ry="15"
            fill={`url(#${innerId})`}
            clipPath={`url(#${clipId})`}
            style={{ mixBlendMode: "screen" }}
          />
          {/* Heller Rand oben + dunkler Rand unten */}
          <rect
            x="2.5"
            y="2.5"
            width="59"
            height="59"
            rx="14.5"
            ry="14.5"
            fill="none"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="0.6"
            clipPath={`url(#${clipId})`}
          />
          <rect
            x="2.5"
            y="2.5"
            width="59"
            height="59"
            rx="14.5"
            ry="14.5"
            fill="none"
            stroke="rgba(0,0,0,0.18)"
            strokeWidth="0.8"
            transform="translate(0,1)"
            clipPath={`url(#${clipId})`}
          />
          {/* Specular-Sliver – feine Linie oben */}
          <rect
            x="6"
            y="4.5"
            width="52"
            height="6"
            rx="3"
            fill={`url(#${specId})`}
            opacity="0.85"
          />
        </>
      )}

      {variant === "flat" && (
        <rect x="2" y="2" width="60" height="60" rx="15" ry="15" fill="hsl(199 92% 42%)" />
      )}

      {variant === "mono" && (
        <rect
          x="2"
          y="2"
          width="60"
          height="60"
          rx="15"
          ry="15"
          fill="currentColor"
          opacity="0.12"
        />
      )}

      {/* V – als stilisierter Uhrzeiger.
          Linker Schenkel kurz (Stundenzeiger), rechter länger und steiler (Minutenzeiger),
          beide an gemeinsamem Pivot bei (32, 46). */}
      <g
        stroke={isMono ? "currentColor" : "#ffffff"}
        strokeWidth="5.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={isMono ? 1 : 0.97}
      >
        <path d="M19 19 L32 46" />
        <path d="M45 14 L32 46" />
      </g>

      {/* Pivot-Dot an der V-Spitze (Zifferblatt-Zentrum) */}
      <circle
        cx="32"
        cy="46"
        r="2.6"
        fill={isMono ? "currentColor" : "#ffffff"}
      />
      <circle
        cx="32"
        cy="46"
        r="1.1"
        fill={isMono ? "rgba(0,0,0,0.45)" : "hsl(199 92% 32%)"}
      />

      {/* 12-Uhr-Marker oben mittig – feine Andeutung Zifferblatt */}
      <circle
        cx="32"
        cy="11"
        r="1.2"
        fill={isMono ? "currentColor" : "rgba(255,255,255,0.85)"}
      />
    </svg>
  );
}

/**
 * Wortmarke + Symbol kombiniert – für Topbar / Marketing.
 * Wortmarke nutzt `currentColor` damit du sie pro Kontext einfärben kannst.
 */
export function VremaLockup({
  size = 32,
  className,
  variant = "glass",
  tagline,
}: {
  size?: number;
  variant?: Variant;
  className?: string;
  /** Optionaler kleiner Untertext (z. B. „Intelligente Zeiterfassung"). */
  tagline?: string;
}): React.JSX.Element {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <VremaMarkLogo size={size} variant={variant} />
      <span className="flex min-w-0 flex-col leading-none">
        <span
          className="font-bold tracking-tight"
          style={{ fontSize: Math.round(size * 0.62), letterSpacing: "-0.02em" }}
        >
          VREMA
        </span>
        {tagline && (
          <span
            className="mt-1 text-fg-muted opacity-80"
            style={{ fontSize: Math.max(9, Math.round(size * 0.24)), letterSpacing: "0.08em" }}
          >
            {tagline}
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * Reine Wortmarke "VREMA" als SVG, brand-color-fähig via `currentColor`.
 * Für sehr kompakte oder Print-Kontexte, in denen das Symbol stört.
 */
export function VremaWordmark({
  size = 24,
  className,
  title = "VREMA",
}: {
  /** Schriftgröße in px. Default: 24. */
  size?: number;
  className?: string;
  title?: string;
}): React.JSX.Element {
  return (
    <span
      role="img"
      aria-label={title}
      className={clsx("inline-flex select-none items-baseline font-bold tracking-tight", className)}
      style={{ fontSize: size, letterSpacing: "-0.025em", lineHeight: 1 }}
    >
      VREMA
    </span>
  );
}
