import { Skeleton } from "@/components/ui/Skeleton";

/** Spiegelt Team-Seite: Hero, Stat-Pills, Listenzeilen. */
export default function TeamLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-1 sm:space-y-6 sm:px-0">
      <section className="flex flex-col gap-4">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-7 w-32 sm:h-8 sm:w-40" />
          <Skeleton className="h-4 w-48 max-w-full" />
        </div>
        <div className="-mx-1 flex snap-x gap-2 overflow-x-hidden px-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[4.5rem] min-w-[10rem] shrink-0 snap-start rounded-2xl sm:min-w-0" rounded="2xl" />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-3 lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-9 w-20 rounded-full" rounded="full" />
            ))}
          </div>
          <Skeleton className="h-10 w-full max-w-md rounded-xl" />
          <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 border-b border-border/40 py-3 last:border-0">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" rounded="full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-full max-w-xs" />
                </div>
                <Skeleton className="h-8 w-16 shrink-0 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
        <div className="hidden space-y-3 lg:block">
          <Skeleton className="h-48 w-full rounded-2xl" rounded="2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" rounded="2xl" />
        </div>
      </div>
    </div>
  );
}
