"use client";

import type { AIInsightItem, AIInsightsPayload } from "@/lib/ai/types";

const levelStyles: Record<AIInsightItem["level"], string> = {
  info: "text-muted-foreground",
  warning: "text-amber-700",
  success: "text-emerald-700",
};

export function AIInsights({ initialPayload }: { initialPayload: AIInsightsPayload }) {
  const items: AIInsightItem[] = initialPayload.items;

  return (
    <div className="px-4 pb-4 pt-2 sm:px-5 sm:pb-5">
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        Keine Rechts- oder Lohnberatung. Inhalte können unvollständig sein — bitte immer mit Ihren eigenen Unterlagen
        abgleichen.
      </p>

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
    </div>
  );
}
