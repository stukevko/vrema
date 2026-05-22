"use client";

import { FileDown, Lock } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { businessUpgradeToast, BUSINESS_UPGRADE_PATH } from "@/lib/plan-upgrade-messages";
import { buildShiftPlanPdf, type ShiftPlanPdfMember, type ShiftPlanPdfShift } from "@/lib/planning/shift-plan-pdf";
import Link from "next/link";

type Props = {
  companyName: string;
  plan: string;
  shiftCycleWeeks: 1 | 2 | 3;
  weekIndex: 1 | 2 | 3;
  members: ShiftPlanPdfMember[];
  shifts: ShiftPlanPdfShift[];
};

export function ShiftPlanPdfExport({
  companyName,
  plan,
  shiftCycleWeeks,
  weekIndex,
  members,
  shifts,
}: Props) {
  const { show } = useToast();
  const hasPdf = plan === "BUSINESS" || plan === "ENTERPRISE";

  const exportPdf = () => {
    if (!hasPdf) {
      show(businessUpgradeToast("pdf"), "info");
      return;
    }
    const { doc, fileName } = buildShiftPlanPdf({
      companyName,
      weekIndex,
      shiftCycleWeeks,
      members,
      shifts,
    });
    doc.save(fileName);
    show(`Schichtplan Woche ${weekIndex} als PDF gespeichert.`, "success");
  };

  if (!hasPdf) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={exportPdf}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-muted-foreground"
        >
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Schichtplan PDF
        </button>
        <Link href={BUSINESS_UPGRADE_PATH} className="text-[11px] font-medium text-brand hover:underline">
          Ab Business-Tarif
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={exportPdf}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft/50 px-3 text-xs font-semibold text-foreground transition-colors hover:bg-brand-soft"
        aria-label={`Schichtplan Woche ${weekIndex} als PDF herunterladen`}
      >
        <FileDown className="h-3.5 w-3.5 text-brand" aria-hidden />
        Schichtplan als PDF
      </button>
      <p className="max-w-[14rem] text-[10px] leading-snug text-muted-foreground">
        Querformat für WhatsApp & Ausdruck — Woche {weekIndex}, alle Teammitglieder.
      </p>
    </div>
  );
}
