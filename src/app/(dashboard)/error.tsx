"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function DashboardSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-red-200/80 bg-red-50/90 px-6 py-10 text-center text-foreground shadow-sm">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </span>
      <div className="space-y-1">
        <h1 className="text-lg font-bold tracking-tight">Bereich konnte nicht geladen werden</h1>
        <p className="text-sm text-muted-foreground">
          {error.message || "Bitte versuchen Sie es erneut oder kehren Sie zum Dashboard zurück."}
        </p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => reset()}
          className="min-h-12 w-full rounded-2xl bg-primary px-4 text-sm font-bold text-foreground ring-1 ring-inset ring-white/20 transition-colors hover:bg-primary/90 sm:w-auto"
        >
          Erneut versuchen
        </button>
        <Link
          href="/dashboard"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-card/80 sm:w-auto"
        >
          Zum Dashboard
        </Link>
      </div>
    </div>
  );
}
