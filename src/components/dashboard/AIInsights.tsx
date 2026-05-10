"use client";

import type { AIInsightItem, AIInsightsPayload } from "@/lib/ai/types";
import Link from "next/link";

const levelStyles: Record<AIInsightItem["level"], string> = {
  info: "text-muted-foreground",
  warning: "text-warning-foreground",
  success: "text-brand",
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
            className="border-b border-line/60 py-3 text-sm leading-relaxed last:border-0 last:pb-0 sm:border-0 sm:py-2 dark:border-white/8"
          >
            <span className={`font-medium ${levelStyles[item.level]}`}>✨</span>{" "}
            <span className="text-foreground">{item.text}</span>
            {item.actionLabel && item.actionHref ? (
              <div className="mt-2">
                <Link
                  href={item.actionHref}
                  className="inline-flex items-center rounded-lg border border-brand/25 bg-brand-soft/90 px-2.5 py-1 text-xs font-semibold text-brand backdrop-blur transition-all hover:scale-[1.02] hover:bg-brand-soft dark:border-white/10 dark:bg-brand/25"
                >
                  {item.actionLabel}
                </Link>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
