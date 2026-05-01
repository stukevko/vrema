"use client";

export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-5 md:space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-52 rounded-xl bg-card/80" />
        <div className="h-4 w-72 rounded-xl bg-card/60" />
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(0,0,0,0.04)]" />
        ))}
      </div>

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
        <div className="h-80 rounded-3xl border border-border bg-card shadow-[0_20px_50px_rgba(0,0,0,0.04)]" />
        <div className="h-80 rounded-3xl border border-border bg-card shadow-[0_20px_50px_rgba(0,0,0,0.04)]" />
      </div>
    </div>
  );
}
