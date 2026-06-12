"use client";

import Link from "next/link";
import { CalendarDays, FileText, CalendarClock } from "lucide-react";
import { DashboardSectionCard } from "@/components/dashboard/DashboardSectionCard";

type Focus = {
  title: string;
  description: string;
  href: string;
  cta: string;
};

/** Mobil-Cockpit für Chefs: Fokus + drei Schnelllinks. */
export function ManagerMobileCockpit({
  focus,
}: {
  focus: Focus;
  planTitle?: string;
}) {
  const hasUrgentFocus = focus.title !== "Heute keine kritischen Hinweise";

  return (
    <DashboardSectionCard
      bare
      padding="default"
      tone={hasUrgentFocus ? "alert" : "brand"}
      className="md:hidden"
      ariaLabel="Führungs-Cockpit"
    >
      <p className="font-semibold text-foreground">{focus.title}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{focus.description}</p>
      <Link
        href={focus.href}
        className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-brand underline-offset-2 hover:underline"
      >
        {focus.cta} →
      </Link>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/60 pt-4">
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
            className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl bg-background/80 px-2 py-2 text-center text-xs font-medium text-foreground transition-colors active:bg-muted/50"
          >
            <q.icon className="h-4 w-4 text-brand" aria-hidden />
            {q.label}
          </Link>
        ))}
      </div>
    </DashboardSectionCard>
  );
}
