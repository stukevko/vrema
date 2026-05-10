import { AIInsights } from "@/components/dashboard/AIInsights";
import { getDashboardAIInsights } from "@/lib/ai/engine";

/**
 * Async RSC: lädt die KI-Insights lazy, damit das Dashboard nicht auf den teuren
 * AI-Aggregations-Block warten muss. Wird in einem `<Suspense fallback>` eingebettet.
 */
export async function AsyncAIInsights({ companyId }: { companyId: string }) {
  const payload = await getDashboardAIInsights(companyId);
  return <AIInsights initialPayload={payload} />;
}

export function AIInsightsSkeleton() {
  return (
    <div className="px-4 pb-4 pt-2 sm:px-5 sm:pb-5" aria-busy aria-live="polite">
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        Analyse läuft …
      </p>
      <ul className="space-y-2">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="h-4 w-full animate-pulse rounded-md bg-muted/60"
            style={{ width: `${100 - i * 12}%` }}
          />
        ))}
      </ul>
    </div>
  );
}
