"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
const STORAGE_KEY = "vrema-theme";

function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

/**
 * Theme-Toggle-Knopf für den Header.
 * - Persistiert Wahl in localStorage
 * - Hört auf OS-Preference-Änderung, solange User keine eigene Wahl getroffen hat
 * - Mounted-State verhindert SSR/CSR-Mismatch beim Icon
 */
export function ThemeToggle(): React.JSX.Element {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(readTheme());
    setMounted(true);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") return;
      const next: Theme = event.matches ? "dark" : "light";
      applyTheme(next);
      setTheme(next);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function toggle(): void {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* still ok */
    }
    setTheme(next);
  }

  const isDark = mounted && theme === "dark";
  const label = isDark ? "Light-Modus aktivieren" : "Dark-Modus aktivieren";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="
        inline-flex h-10 w-10 items-center justify-center
        rounded-full border border-line bg-surface text-fg-muted
        shadow-sm
        transition-all duration-200
        hover:border-brand/40 hover:text-brand hover:shadow-md
        focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-offset-0
      "
      suppressHydrationWarning
    >
      {/* Beide Icons gerendert, das jeweils inaktive ist visuell weg → kein Layout-Shift */}
      <Sun
        className={`h-[18px] w-[18px] transition-all ${
          isDark ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
        }`}
        aria-hidden
      />
      <Moon
        className={`absolute h-[18px] w-[18px] transition-all ${
          isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
        }`}
        aria-hidden
      />
    </button>
  );
}
