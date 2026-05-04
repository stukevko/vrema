/** Einheitliches Ladegerüst für Dashboard-Unterseiten (Layout-orientiert, kein „weißer Screen“). */
export function DashboardRouteSkeleton({
  maxWidthClass = "max-w-6xl",
  bodyRows = 3,
}: {
  maxWidthClass?: "max-w-4xl" | "max-w-5xl" | "max-w-6xl";
  bodyRows?: number;
}) {
  return (
    <div className={`mx-auto ${maxWidthClass} space-y-5 px-2 animate-pulse sm:space-y-6 sm:px-0`}>
      <div className="space-y-2">
        <div className="h-8 w-44 rounded-xl bg-muted sm:h-9 sm:w-52" />
        <div className="h-4 w-full max-w-md rounded-xl bg-muted/70" />
        <div className="h-4 w-2/3 max-w-sm rounded-xl bg-muted/50" />
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-6">
        <div className="mb-4 h-5 w-32 rounded-lg bg-muted" />
        <div className="space-y-3">
          {Array.from({ length: bodyRows }).map((_, i) => (
            <div key={i} className="h-12 w-full rounded-xl bg-muted/60" />
          ))}
        </div>
      </div>
      <div className="h-48 rounded-2xl border border-border bg-card/80 sm:h-56" />
    </div>
  );
}
