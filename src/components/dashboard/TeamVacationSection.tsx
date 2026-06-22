"use client";

import { useRef } from "react";
import { VacationList } from "@/components/dashboard/VacationList";
import { useHashHighlight } from "@/components/dashboard/useHashHighlight";
import { DashboardSectionCard } from "@/components/dashboard/DashboardSectionCard";
import type { VacationDecisionContext } from "@/lib/actions/vacation";

type Row = {
  id: string;
  absenceType?: "VACATION" | "SICK" | "OTHER";
  startDate: Date | string;
  endDate: Date | string;
  days: number;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  userName?: string;
  decisionNote?: string | null;
  hasSickAttachment?: boolean;
  context?: VacationDecisionContext;
  approvedBy?: { name: string | null } | null;
};

export function TeamVacationSection({ rows }: { rows: Row[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const flash = useHashHighlight("team-vacation-requests", ref);

  return (
    <div id="team-vacation-requests" ref={ref} className="scroll-mt-24">
      <DashboardSectionCard
        title="Team-Anträge"
        className={
          flash ? "border-primary ring-4 ring-primary/40 transition-all duration-500" : "transition-all duration-500"
        }
      >
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine offenen Urlaubsanträge — alles erledigt.</p>
        ) : (
          <VacationList requests={rows} canApprove={true} />
        )}
      </DashboardSectionCard>
    </div>
  );
}
