"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, Sparkles } from "lucide-react";

/**
 * VREMA AI sekundär: auf Mobil standard eingeklappt (weniger Rauschen),
 * ab md automatisch geöffnet.
 */
export function DashboardAISection({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => {
      el.open = mq.matches;
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <details
      ref={ref}
      className="group glass-card overflow-hidden"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-brand-soft text-brand dark:border-white/10 dark:bg-brand/25">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Hinweis</p>
            <p className="text-sm font-semibold text-foreground">Stunden, Kosten & Pausen</p>
          </div>
        </div>
        <ChevronDown
          className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 md:hidden"
          aria-hidden
        />
      </summary>
      <div className="border-t border-white/30 px-1 pb-1 pt-0 dark:border-white/10">{children}</div>
    </details>
  );
}
