"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader2 } from "lucide-react";
import { resetAiWeight } from "@/lib/actions/insights";

/**
 *  Reset eines einzelnen AI-Faktors auf 1.0 (= keine Korrektur).
 *  User Journey: Owner klickt → kurzer Spinner → Tabelle aktualisiert sich.
 */
export function AiWeightResetButton({
  dimension,
  weightKey,
}: {
  dimension: string;
  weightKey: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (pending) return;
        startTransition(async () => {
          try {
            await resetAiWeight({ dimension, key: weightKey });
            router.refresh();
          } catch (e) {
            console.error(e);
          }
        });
      }}
      disabled={pending}
      className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-[11px] font-medium text-foreground transition-colors hover:bg-surface-muted disabled:opacity-50 dark:border-white/[0.06] dark:bg-surface/60"
      title="Anpassung auf Neutralwert zurücksetzen"
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
      Zurücksetzen
    </button>
  );
}
