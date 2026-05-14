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
      <div className="mx-auto w-full max-w-md space-y-3 text-left">
        <h1 className="text-center text-lg font-bold tracking-tight">Bereich konnte nicht geladen werden</h1>
        <p className="text-center text-sm text-muted-foreground">
          {error.message?.trim()
            ? error.message
            : "Bitte erneut versuchen oder zum Dashboard zurück. Details siehe unten."}
        </p>
        <p className="rounded-lg border border-border/70 bg-background/60 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          An error occurred in the Server Components render. The specific message is omitted in production builds to
          avoid leaking sensitive details. A digest property is included on this error instance which may provide
          additional details about the nature of the error.
        </p>
        {error.digest ? (
          <p className="text-center text-[11px] text-muted-foreground">
            Digest:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{String(error.digest)}</code>
          </p>
        ) : null}
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
