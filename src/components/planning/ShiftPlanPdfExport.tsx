"use client";

import { FileDown, Share2 } from "lucide-react";
import { useMemo } from "react";
import { useToast } from "@/components/ui/Toast";
import {
  buildShiftPlanMonthPdf,
  buildShiftsByUserIsoForMonth,
  monthDaysInAnchor,
  resolveExportMembers,
  type ShiftPlanPdfMember,
  type ShiftPlanPdfShift,
} from "@/lib/planning/shift-plan-pdf";
import { monthYearLabel } from "@/lib/planning/cycle-display-date";
import { Button } from "@/components/ui/Button";

type Props = {
  companyName: string;
  plan: string;
  monthAnchor: Date;
  shiftCycleWeeks: import("@/lib/shift-cycle").ShiftCycleWeeks;
  members: ShiftPlanPdfMember[];
  shifts: ShiftPlanPdfShift[];
};

export function ShiftPlanPdfExport({
  companyName,
  plan: _plan,
  monthAnchor,
  shiftCycleWeeks,
  members,
  shifts,
}: Props) {
  const { show } = useToast();
  const monthLabel = useMemo(() => monthYearLabel(monthAnchor), [monthAnchor]);
  const monthDays = useMemo(() => monthDaysInAnchor(monthAnchor), [monthAnchor]);
  const exportMembers = useMemo(
    () => resolveExportMembers(members, monthDays, shiftCycleWeeks, shifts),
    [members, monthDays, shiftCycleWeeks, shifts],
  );
  const shiftsInMonth = useMemo(() => {
    const map = buildShiftsByUserIsoForMonth(monthDays, shiftCycleWeeks, shifts);
    let n = 0;
    for (const list of map.values()) n += list.length;
    return n;
  }, [monthDays, shiftCycleWeeks, shifts]);

  const pageHint =
    monthDays.length > 28 ? " · ggf. 2+ Seiten" : "";
  const metaLine = `${monthLabel} · ${exportMembers.length} Pers. · ${shiftsInMonth} Schichten${pageHint}`;

  const exportPdf = () => {
    const { doc, fileName } = buildShiftPlanMonthPdf({
      companyName,
      monthAnchor,
      shiftCycleWeeks,
      members,
      shifts,
    });
    doc.save(fileName);
    show(`Schichtplan ${monthLabel} gespeichert — alle Tage & Mitarbeitende.`, "success");
  };

  return (
    <>
      <details className="group surface-panel rounded-xl open:border-brand/30 md:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-center gap-2">
            <Share2 className="h-4 w-4 shrink-0 text-brand" aria-hidden />
            <span className="min-w-0">
              <span className="block text-sm font-bold text-foreground">Plan teilen</span>
              <span className="block truncate text-[11px] text-muted-foreground">{metaLine}</span>
            </span>
          </span>
          <Button
            type="button"
            variant="brand"
            size="sm"
            leadingIcon={<FileDown className="h-3.5 w-3.5" />}
            onClick={(e) => {
              e.preventDefault();
              exportPdf();
            }}
            className="shrink-0"
          >
            PDF
          </Button>
        </summary>
        <div className="border-t border-brand/15 px-3 pb-3 pt-2 text-[11px] text-muted-foreground">
          Kompletter Monat: alle Mitarbeitenden × alle Tage — Querformat für WhatsApp.
        </div>
      </details>

      <div className="surface-panel hidden flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between md:flex">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-brand/10 text-brand dark:border-white/10">
            <Share2 className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">Plan fürs Team teilen</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {metaLine} — Querformat, alle Tage des Monats.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="brand"
          size="sm"
          leadingIcon={<FileDown className="h-4 w-4" />}
          onClick={exportPdf}
          aria-label={`Schichtplan ${monthLabel} als PDF herunterladen`}
          className="shrink-0 self-start sm:self-center"
        >
          PDF herunterladen
        </Button>
      </div>
    </>
  );
}
