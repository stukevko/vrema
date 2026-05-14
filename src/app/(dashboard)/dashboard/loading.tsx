"use client";

import { Skeleton } from "@/components/ui/Skeleton";

/** Spiegelt die Struktur von `dashboard/page.tsx`: Begrüßung, optional Fokus-Zeile, Terminal+Saldo+AI, Heute. */
export default function DashboardLoading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 px-2 sm:gap-6 sm:px-0 md:gap-8 md:px-0">
      <div className="shrink-0 space-y-3 rounded-2xl glass-panel p-5 sm:p-8">
        <Skeleton className="h-8 w-56 max-w-[85%] sm:h-9 sm:w-64" />
        <Skeleton className="h-4 w-48 max-w-[70%]" />
      </div>

      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card p-5 sm:p-6">
        <div className="flex gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" rounded="xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-full max-w-md" />
            <Skeleton className="h-4 w-full max-w-sm" />
            <Skeleton className="h-11 w-40 rounded-2xl" rounded="2xl" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 md:grid md:grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
        <div className="min-h-[14rem] space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mx-auto h-36 w-36" rounded="full" />
          <div className="flex justify-center gap-2">
            <Skeleton className="h-12 w-28 rounded-2xl" rounded="2xl" />
            <Skeleton className="h-12 w-28 rounded-2xl" rounded="2xl" />
          </div>
        </div>
        <div className="min-h-[12rem] space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-6">
          <Skeleton className="h-5 w-36" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-xl" rounded="xl" />
            <Skeleton className="h-8 w-28" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" rounded="full" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-5 sm:py-4">
            <Skeleton className="h-8 w-8 shrink-0 rounded-2xl" rounded="2xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="space-y-3 p-4 sm:p-5">
            <Skeleton className="h-3 w-full" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3 border-b border-border/50 py-2 last:border-0">
                <Skeleton className="h-4 w-4 shrink-0" rounded="sm" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-[80%]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl glass-panel p-5 sm:p-8">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex h-12 items-center justify-between rounded-2xl border border-border/30 bg-background/80 px-3"
            >
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
