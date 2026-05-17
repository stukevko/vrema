import { AIInsights } from "@/components/dashboard/AIInsights";
import { getDashboardAIInsights } from "@/lib/ai/engine";
import { logServerError } from "@/lib/server-logger";
import { AlertTriangle } from "lucide-react";

/**
 * Async RSC: lädt die KI-Insights lazy, damit das Dashboard nicht auf den teuren
 * AI-Aggregations-Block warten muss. Wird in einem `<Suspense fallback>` eingebettet.
 *
 * Defensive: Crashed der KI-Block (z. B. fehlende Migration auf der VM, Wetter-Cache
 * leer), reißt er NICHT die ganze Dashboard-Seite mit – wir zeigen einen ruhigen
 * Soft-Fallback und loggen serverseitig.
 */
export async function AsyncAIInsights({ companyId }: { companyId: string }) {
  try {
    const payload = await getDashboardAIInsights(companyId);
    return <AIInsights initialPayload={payload} />;
  } catch (err) {
    logServerError("dashboard.aiInsights", err, { companyId });
    return <AIInsightsFailure />;
  }
}

function AIInsightsFailure() {
  return (
    <div className="px-4 pb-4 pt-2 sm:px-5 sm:pb-5">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/70 px-3 py-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
        <p className="text-xs leading-relaxed text-amber-900">
          Hinweise sind momentan nicht verfügbar. Dein Dashboard funktioniert normal weiter –
          lade die Seite neu oder versuche es später erneut.
        </p>
      </div>
    </div>
  );
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
