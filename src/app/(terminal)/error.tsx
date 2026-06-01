"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Terminal-Fehlerseite.
 *
 * Zielgruppe: ungeschultes Personal an der Stempeluhr. Deshalb bewusst groß,
 * ruhig und mit genau EINER eindeutigen Aktion ("Nochmal versuchen") –
 * keine technische Next.js-Standardmeldung, kein Dead-End.
 */
export default function TerminalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[terminal]", error);
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background px-6 py-10 text-fg">
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-3xl border border-border bg-card px-8 py-12 text-center shadow-sm">
        <span className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-red-100 text-red-700">
          <AlertTriangle className="h-10 w-10" aria-hidden />
        </span>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Terminal kurz nicht erreichbar
          </h1>
          <p className="text-base text-muted-foreground">
            Kein Problem – das passiert manchmal. Tippe auf den Button, um es erneut zu
            versuchen.
          </p>
        </div>

        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-primary px-6 text-lg font-bold text-foreground ring-1 ring-inset ring-white/20 transition-colors hover:bg-primary/90"
        >
          <RotateCcw className="h-6 w-6" aria-hidden />
          Nochmal versuchen
        </button>

        <p className="text-sm text-muted-foreground">
          Wenn es weiterhin nicht klappt, bitte kurz die Chefin oder den Chef Bescheid geben.
        </p>
      </div>
    </div>
  );
}
