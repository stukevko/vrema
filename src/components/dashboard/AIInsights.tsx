"use client";

import type { AIInsightItem, AIInsightsPayload } from "@/lib/ai/types";
import Link from "next/link";
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";

const levelStyles: Record<AIInsightItem["level"], { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: "text-sky-700 dark:text-sky-200" },
  warning: { icon: AlertTriangle, className: "text-amber-800 dark:text-amber-100" },
  success: { icon: CheckCircle2, className: "text-emerald-800 dark:text-emerald-200" },
};

export function AIInsights({ initialPayload }: { initialPayload: AIInsightsPayload }) {
  const items: AIInsightItem[] = initialPayload.items;

  return (
    <div className="px-4 pb-4 pt-2 sm:px-5 sm:pb-5">
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        Kurze Hinweise aus Stunden, Plan und Kosten — bitte mit deinen Unterlagen abgleichen, keine Rechtsberatung.
      </p>

      <ul className="space-y-3">
        {items.map((item) => {
          const Lvl = levelStyles[item.level];
          const Icon = Lvl.icon;
          return (
            <li
              key={item.id}
              className="rounded-xl border border-border/60 bg-background/60 px-3 py-2.5 text-sm leading-relaxed dark:border-white/8 dark:bg-surface/40"
            >
              <p className={`flex items-start gap-2 font-medium ${Lvl.className}`}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span className="text-foreground">{item.text}</span>
              </p>
              {item.actionLabel && item.actionHref ? (
                <div className="mt-2 pl-6">
                  <Link
                    href={item.actionHref}
                    className="inline-flex items-center rounded-lg border border-brand/25 bg-brand-soft/95 px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand-soft dark:border-white/10 dark:bg-brand/25"
                  >
                    {item.actionLabel}
                  </Link>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
