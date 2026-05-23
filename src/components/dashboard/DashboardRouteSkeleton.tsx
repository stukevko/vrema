import { Skeleton } from "@/components/ui/Skeleton";

/** Einheitliches Ladegerüst für Dashboard-Unterseiten (Layout-orientiert, kein „weißer Screen“). */
export function DashboardRouteSkeleton({
  maxWidthClass = "max-w-6xl",
  bodyRows = 3,
}: {
  maxWidthClass?: "max-w-4xl" | "max-w-5xl" | "max-w-6xl";
  bodyRows?: number;
}) {
  return (
    <div className={`mx-auto ${maxWidthClass} space-y-5 px-1 sm:space-y-6 sm:px-0`}>
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-44 sm:w-52" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-6">
        <Skeleton className="mb-4 h-5 w-32" />
        <div className="space-y-3">
          {Array.from({ length: bodyRows }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" rounded="xl" />
          ))}
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-2xl sm:h-56" rounded="2xl" />
    </div>
  );
}
