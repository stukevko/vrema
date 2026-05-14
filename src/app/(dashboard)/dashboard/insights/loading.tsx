import { Skeleton } from "@/components/ui/Skeleton";

export default function InsightsLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-1 sm:px-0">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" rounded="xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-2/3 max-w-sm" />
          </div>
        </div>
      </div>
      <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <Skeleton className="h-5 w-48" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" rounded="xl" />
        ))}
      </div>
    </div>
  );
}
