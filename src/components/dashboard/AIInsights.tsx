"use client";

import { useEffect, useState } from "react";
import { getMockDashboardAIInsights } from "@/lib/ai/mock";
import type { AIInsightItem } from "@/lib/ai/types";

const levelStyles: Record<AIInsightItem["level"], string> = {
  info: "text-muted-foreground",
  warning: "text-amber-700",
  success: "text-emerald-700",
};

function InsightRowSkeleton() {
  return (
    <div className="flex gap-3 border-b border-border/60 py-3 last:border-0">
      <div className="mt-0.5 h-4 w-4 shrink-0 rounded bg-muted animate-pulse" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3.5 w-full max-w-[95%] rounded-md bg-muted animate-pulse" />
        <div className="h-3.5 w-full max-w-[78%] rounded-md bg-muted animate-pulse" />
      </div>
    </div>
  );
}

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
    <div className="px-4 pb-4 pt-2 sm:px-5 sm:pb-5">
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        Keine Rechts- oder Lohnberatung. Inhalte können unvollständig sein — bitte immer mit Ihren eigenen Unterlagen
        abgleichen.
      </p>

      {loading ? (
        <ul className="space-y-0" aria-busy="true" aria-label="Hinweise werden geladen">
          {[0, 1, 2].map((k) => (
            <li key={k}>
              <InsightRowSkeleton />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-0">
          {items.map((item) => (
            <li
              key={item.id}
              className="border-b border-border/60 py-3 text-sm leading-relaxed last:border-0 last:pb-0 sm:border-0 sm:py-2"
            >
              <span className={`font-medium ${levelStyles[item.level]}`}>✨</span>{" "}
              <span className="text-foreground">{item.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
