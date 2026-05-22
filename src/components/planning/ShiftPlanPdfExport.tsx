"use client";

import { FileDown, Lock, Share2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { businessUpgradeToast, BUSINESS_UPGRADE_PATH } from "@/lib/plan-upgrade-messages";
import { buildShiftPlanPdf, type ShiftPlanPdfMember, type ShiftPlanPdfShift } from "@/lib/planning/shift-plan-pdf";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

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
  const shiftsInWeek = shifts.filter((s) => s.weekIndex === weekIndex && !Number.isNaN(s.dayOfWeek)).length;

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
    show(`Schichtplan Woche ${weekIndex} gespeichert — bereit für WhatsApp.`, "success");
  };

  if (!hasPdf) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-line bg-surface-muted/60 p-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">Team-Plan teilen</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            PDF mit allen Schichten — ab Business-Tarif.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" leadingIcon={<Lock className="h-3.5 w-3.5" />} onClick={exportPdf}>
            PDF gesperrt
          </Button>
          <Link href={BUSINESS_UPGRADE_PATH} className="text-[11px] font-semibold text-brand hover:underline">
            Freischalten →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-brand/20 bg-gradient-to-br from-brand-soft/80 to-surface p-3 shadow-sm dark:border-white/10 dark:from-brand/15 dark:to-surface/90 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-brand/10 text-brand dark:border-white/10">
          <Share2 className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">Plan fürs Team teilen</p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            Woche {weekIndex}
            {shiftCycleWeeks > 1 ? ` von ${shiftCycleWeeks}` : ""} · {members.length} Personen · {shiftsInWeek}{" "}
            Schichten — Querformat für WhatsApp.
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="brand"
        size="sm"
        leadingIcon={<FileDown className="h-4 w-4" />}
        onClick={exportPdf}
        aria-label={`Schichtplan Woche ${weekIndex} als PDF herunterladen`}
        className="shrink-0 self-start sm:self-center"
      >
        PDF herunterladen
      </Button>
    </div>
  );
}
