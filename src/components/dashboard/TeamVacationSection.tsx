"use client";

import { useRef } from "react";
import { VacationList } from "@/components/dashboard/VacationList";
import { useHashHighlight } from "@/components/dashboard/useHashHighlight";
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
  context?: VacationDecisionContext;
  approvedBy?: { name: string | null } | null;
};

export function TeamVacationSection({ rows }: { rows: Row[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const flash = useHashHighlight("team-vacation-requests", ref);

  return (
    <div
      id="team-vacation-requests"
      ref={ref}
      className={`scroll-mt-24 rounded-2xl border bg-card p-5 transition-all duration-500 sm:p-8 ${
        flash
          ? "border-primary ring-4 ring-primary/40 shadow-[0_24px_60px_rgba(0,0,0,0.10)]"
          : "border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)]"
      }`}
    >
      <h2 className="font-semibold tracking-tight mb-4">Team-Anträge</h2>
      <VacationList requests={rows} canApprove={true} />
    </div>
  );
}
