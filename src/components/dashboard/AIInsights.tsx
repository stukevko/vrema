"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { getMockDashboardAIInsights } from "@/lib/ai/mock";
import type { AIInsightItem } from "@/lib/ai/types";

const levelStyles: Record<AIInsightItem["level"], string> = {
  info: "text-muted-foreground",
  warning: "text-amber-700",
  success: "text-emerald-700",
};

export function AIInsights() {
  const [items, setItems] = useState<AIInsightItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const payload = await getMockDashboardAIInsights();
      if (!active) return;
      setItems(payload.items);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="relative rounded-2xl p-[1px] bg-gradient-to-r from-violet-300/40 via-sky-300/30 to-emerald-300/40">
      <div className="rounded-2xl bg-white border border-border p-6 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-violet-100/80 text-violet-700">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">VREMA AI</p>
            <h3 className="text-sm font-semibold text-foreground">Intelligente Hinweise</h3>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            <div className="h-4 rounded-full bg-muted animate-pulse" />
            <div className="h-4 rounded-full bg-muted animate-pulse w-11/12" />
            <div className="h-4 rounded-full bg-muted animate-pulse w-10/12" />
          </div>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.id} className="border-b border-border/60 py-1 text-sm leading-relaxed last:border-0 last:pb-0 sm:border-0 sm:py-0">
                <span className={`font-medium ${levelStyles[item.level]}`}>✨</span>{" "}
                <span className="text-foreground">{item.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
