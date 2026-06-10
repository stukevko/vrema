"use client";

import Link from "next/link";
import { CalendarDays, FileText, CalendarClock } from "lucide-react";

type Focus = {
  title: string;
  description: string;
  href: string;
  cta: string;
};

/**
 * Mobil-Cockpit für Chefs: 3-Schritte-Flow + Fokus + Schnellzugriff.
 * Desktop nutzt weiterhin HeroStats + Sidebar.
 */
export function ManagerMobileCockpit({
  focus,
  planTitle,
}: {
  focus: Focus;
  planTitle: string;
}) {
  const hasUrgentFocus = focus.title !== "Heute keine kritischen Hinweise";

  return (
    <section
      aria-label="Führungs-Cockpit"
      className="glass-card min-w-0 max-w-full overflow-hidden rounded-2xl border border-border p-4 md:hidden"
    >
      <ol className="mb-4 flex gap-2" aria-label="Dein Ablauf heute">
        {[
          { n: "1", t: "Fokus", active: hasUrgentFocus },
          { n: "2", t: planTitle, active: true },
          { n: "3", t: "Team", active: true },
        ].map((step) => (
          <li
            key={step.n}
            className={`flex flex-1 flex-col items-center rounded-xl border px-2 py-2 text-center ${
              step.active ? "border-brand/35 bg-brand-soft/80" : "border-border/70 bg-muted/30"
            }`}
          >
            <span className="text-[10px] font-bold text-brand">{step.n}</span>
            <span className="text-[10px] font-semibold text-foreground">{step.t}</span>
          </li>
        ))}
      </ol>

      <div
        className={`rounded-2xl px-4 py-3 text-sm ${
          hasUrgentFocus
            ? "border border-warning/30 bg-warning-soft/40 text-foreground"
            : "border border-border/70 bg-muted/20 text-foreground"
        }`}
      >
        <p className="font-semibold">{focus.title}</p>
        <p className="mt-0.5 text-muted-foreground">{focus.description}</p>
        <Link
          href={focus.href}
          className="mt-2 inline-flex min-h-10 items-center text-sm font-bold text-brand underline-offset-2"
        >
          {focus.cta} →
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {(
          [
            { href: "/dashboard/reports", label: "Berichte", icon: FileText },
            { href: "/dashboard/planning", label: "Planung", icon: CalendarDays },
            { href: "/dashboard/vacation", label: "Urlaub", icon: CalendarClock },
          ] as const
        ).map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-background px-2 py-2 text-center text-xs font-semibold text-foreground transition-colors active:scale-[0.99] active:bg-muted/40"
          >
            <q.icon className="h-4 w-4 text-brand" aria-hidden />
            {q.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
