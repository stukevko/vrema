"use client";

import Link from "next/link";
import { Handshake } from "lucide-react";
import { DashboardSectionCard } from "@/components/dashboard/DashboardSectionCard";
import { CollapsibleMobileSection } from "@/components/dashboard/CollapsibleMobileSection";
import { CollapsibleDesktopSection } from "@/components/dashboard/CollapsibleDesktopSection";

/** Mobil: Hinweis oben, Freigaben unten eingeklappt. */
export function PlanningTradeApprovalsHint({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <DashboardSectionCard tone="alert" bare padding="default" className="md:hidden">
      <p className="font-semibold text-foreground">
        {count} Tauschantrag{count === 1 ? "" : "e"} warten auf Freigabe
      </p>
      <p className="mt-1 text-sm text-muted-foreground">Vorher/Nachher prüfen und sicher entscheiden.</p>
      <Link
        href="#shift-trade-approvals"
        className="btn-brand mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-2xl px-4 text-sm font-bold active:scale-[0.99]"
      >
        Freigaben prüfen
      </Link>
    </DashboardSectionCard>
  );
}

export function PlanningManagerExtras({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <>
      <div className="md:hidden">
        <CollapsibleMobileSection label={label} defaultOpen={defaultOpen}>
          {children}
        </CollapsibleMobileSection>
      </div>
      <CollapsibleDesktopSection label={label} defaultOpen={defaultOpen}>
        {children}
      </CollapsibleDesktopSection>
    </>
  );
}
