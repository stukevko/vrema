"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const THRESHOLD = 72;
const PETROL = "#0a3a52";

type Props = {
  /** Scroll-Container (z. B. `<main>`) – Ref auf dem Element mit `overflow-y-auto`. */
  scrollRef: React.RefObject<HTMLElement | null>;
  enabled?: boolean;
};

/**
 * Pull-to-Refresh: am Listenanfang nach unten ziehen → `router.refresh()`.
 * Petrolfarbener Loader (#0a3a52), nur mobil (`md:hidden` im Render).
 */
export function DashboardPullToRefresh({ scrollRef, enabled = true }: Props) {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);
  const armedRef = useRef(false);
  const startYRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    if (!enabled) return;
    const el = scrollRef.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      if (el.scrollTop <= 0) {
        armedRef.current = true;
        startYRef.current = e.touches[0]?.clientY ?? 0;
      } else {
        armedRef.current = false;
      }
    };

    const onMove = (e: TouchEvent) => {
      if (!armedRef.current || refreshingRef.current) return;
      if (el.scrollTop > 0) {
        armedRef.current = false;
        pullRef.current = 0;
        setPull(0);
        return;
      }
      const y = e.touches[0]?.clientY ?? 0;
      const dy = y - startYRef.current;
      if (dy <= 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      const damped = Math.min(THRESHOLD * 1.15, dy * 0.45);
      pullRef.current = damped;
      setPull(damped);
      if (dy > THRESHOLD * 0.85) e.preventDefault();
    };

    const onEnd = () => {
      if (!armedRef.current) return;
      armedRef.current = false;
      const p = pullRef.current;
      pullRef.current = 0;
      if (p >= THRESHOLD * 0.75 && !refreshingRef.current) {
        setRefreshing(true);
        setPull(THRESHOLD);
        router.refresh();
        window.setTimeout(() => {
          setRefreshing(false);
          setPull(0);
        }, 650);
      } else {
        setPull(0);
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [enabled, router, scrollRef]);

  if (!enabled || pull <= 2) return null;

  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-[calc(4rem+env(safe-area-inset-top,0px))] z-[45] flex justify-center md:hidden"
      aria-live="polite"
    >
      <div
        className="flex flex-col items-center gap-1 rounded-full border border-white/30 bg-white/90 px-4 py-2 shadow-md backdrop-blur-md dark:bg-background/90"
        style={{
          transform: `translateY(${Math.min(28, pull * 0.35)}px)`,
          opacity: 0.35 + progress * 0.65,
        }}
      >
        <div
          className="h-7 w-7 rounded-full border-2 border-transparent motion-safe:animate-spin"
          style={{
            borderTopColor: PETROL,
            borderRightColor: `${PETROL}44`,
            borderBottomColor: `${PETROL}22`,
            borderLeftColor: `${PETROL}44`,
          }}
          aria-hidden
        />
        {refreshing ? (
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PETROL }}>
            Aktualisiert…
          </span>
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Loslassen zum Aktualisieren
          </span>
        )}
      </div>
    </div>
  );
}
