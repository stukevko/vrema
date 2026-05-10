"use client";

/** Spiegelt die Struktur von `dashboard/page.tsx`: Begrüßung, optional Fokus-Zeile, Terminal+Saldo+AI, Heute. */
export default function DashboardLoading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 px-2 sm:gap-6 sm:px-0 md:gap-8 md:px-0">
      <div className="shrink-0 space-y-3 rounded-2xl glass-panel p-5 sm:p-8">
        <div className="h-8 w-56 max-w-[85%] animate-pulse rounded-xl bg-muted/70 sm:h-9 sm:w-64" />
        <div className="h-4 w-48 max-w-[70%] animate-pulse rounded-lg bg-muted/50" />
      </div>

      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card p-5 sm:p-6">
        <div className="flex gap-3">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-primary/15" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
            <div className="h-5 w-full max-w-md animate-pulse rounded-lg bg-muted/70" />
            <div className="h-4 w-full max-w-sm animate-pulse rounded bg-muted/50" />
            <div className="h-11 w-40 animate-pulse rounded-2xl bg-primary/25" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 md:grid md:grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
        <div className="min-h-[14rem] space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-6">
          <div className="h-5 w-32 animate-pulse rounded-lg bg-muted/70" />
          <div className="mx-auto h-36 w-36 animate-pulse rounded-full bg-muted/40" />
          <div className="flex justify-center gap-2">
            <div className="h-12 w-28 animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-12 w-28 animate-pulse rounded-2xl bg-muted/60" />
          </div>
        </div>
        <div className="min-h-[12rem] space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-6">
          <div className="h-5 w-36 animate-pulse rounded-lg bg-muted/70" />
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 animate-pulse rounded-xl bg-muted/50" />
            <div className="h-8 w-28 animate-pulse rounded-md bg-muted/60" />
          </div>
          <div className="h-2 w-full animate-pulse rounded-full bg-muted/40" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-5 sm:py-4">
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-2xl bg-muted/50" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-32 animate-pulse rounded bg-muted/50" />
              <div className="h-4 w-48 animate-pulse rounded bg-muted/60" />
            </div>
          </div>
          <div className="space-y-3 p-4 sm:p-5">
            <div className="h-3 w-full animate-pulse rounded bg-muted/40" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3 border-b border-border/50 py-2 last:border-0">
                <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-muted/50" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-full animate-pulse rounded bg-muted/50" />
                  <div className="h-3.5 w-[80%] animate-pulse rounded bg-muted/40" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl glass-panel p-5 sm:p-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-5 w-20 animate-pulse rounded bg-muted/60" />
          <div className="h-5 w-16 animate-pulse rounded bg-muted/50" />
        </div>
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex h-12 animate-pulse items-center justify-between rounded-2xl bg-background px-3">
              <div className="h-3 w-40 rounded bg-muted/50" />
              <div className="h-3 w-12 rounded bg-muted/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
