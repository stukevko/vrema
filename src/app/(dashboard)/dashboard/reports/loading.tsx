"use client";

export default function ReportsLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-5 md:space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-xl bg-card/80" />
          <div className="h-4 w-56 rounded-xl bg-card/60" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-11 w-32 rounded-2xl bg-card/80" />
          ))}
        </div>
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(0,0,0,0.05)]" />
        ))}
      </div>

      <div className="h-96 rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(0,0,0,0.05)]" />
    </div>
  );
}
