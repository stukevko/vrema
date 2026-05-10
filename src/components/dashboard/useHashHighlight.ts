"use client";

import { useEffect, useState } from "react";

/**
 * Sorgt dafür, dass beim Aufruf einer URL mit #anchor das Ziel-Element
 * sanft in den Sichtbereich gescrollt wird und temporär einen
 * "Pulse"-State zurückliefert. UX-Ziel: Der Nutzer wird vom Dashboard-CTA
 * ohne Suchen zur konkreten Aufgabe geführt.
 *
 * Verwendung im Komponentencode:
 *   const refContainer = useRef<HTMLDivElement | null>(null);
 *   const isFlashing = useHashHighlight("zeitkorrekturen", refContainer, 2500);
 */
export function useHashHighlight(
  hash: string,
  ref: React.RefObject<HTMLElement | null>,
  durationMs = 2500
) {
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = `#${hash}`;
    let timer: number | undefined;

    const run = () => {
      if (window.location.hash !== target) return;
      const node = ref.current;
      if (!node) return;
      const top = node.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      setIsFlashing(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIsFlashing(false), durationMs);
    };

    run();
    window.addEventListener("hashchange", run);
    return () => {
      window.removeEventListener("hashchange", run);
      window.clearTimeout(timer);
    };
  }, [hash, ref, durationMs]);

  return isFlashing;
}
