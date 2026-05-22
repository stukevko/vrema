import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  dateForPlannerCycleDay,
  dayOrderMonFirst,
  formatPlannerWeekRange,
  mondayOfWeekContaining,
} from "@/lib/planning/cycle-display-date";

/** Mo=1 … So=0 (JS getDay-Konvention im Planer). */
const PLANNER_DAYS_MON_FIRST = [1, 2, 3, 4, 5, 6, 0] as const;
const DAY_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

export type ShiftPlanPdfMember = {
  id: string;
  name: string;
  area?: string | null;
};

export type ShiftPlanPdfShift = {
  userId: string;
  weekIndex: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakDuration?: number;
};

function pdfSafe(text: string): string {
  return text
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss");
}

function formatTimeHm(value: string): string {
  const m = value.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return value.slice(0, 5);
  return `${m[1]!.padStart(2, "0")}:${m[2]}`;
}

function formatShiftCell(shift: ShiftPlanPdfShift): string {
  const start = formatTimeHm(shift.startTime);
  const end = formatTimeHm(shift.endTime);
  const br = Math.max(0, shift.breakDuration ?? 0);
  if (br > 0) return `${start}-${end}\nPause ${br} Min`;
  return `${start}-${end}`;
}

function dayColumnHeader(weekIndex: 1 | 2 | 3, dayOfWeek: number): string {
  const d = dateForPlannerCycleDay(weekIndex, dayOfWeek);
  const dateLine = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  return `${DAY_SHORT[dayOfWeek]}\n${dateLine}`;
}

function pdfHeaderFirmenzeile(companyName: string): string {
  const trimmed = companyName.trim();
  return trimmed.length > 0 ? pdfSafe(trimmed) : "Schichtplan";
}

export function buildShiftPlanPdf(input: {
  companyName: string;
  weekIndex: 1 | 2 | 3;
  shiftCycleWeeks: 1 | 2 | 3;
  members: ShiftPlanPdfMember[];
  shifts: ShiftPlanPdfShift[];
}): { doc: jsPDF; fileName: string } {
  const { companyName, weekIndex, shiftCycleWeeks, members, shifts } = input;
  const weekShifts = shifts.filter((s) => s.weekIndex === weekIndex && !Number.isNaN(s.dayOfWeek));
  const shiftByUserDay = new Map<string, ShiftPlanPdfShift>();
  for (const s of weekShifts) {
    shiftByUserDay.set(`${s.userId}-${s.dayOfWeek}`, s);
  }

  const sortedMembers = [...members]
    .filter((m) => m.name.trim().length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "de-DE"));

  const monday = mondayOfWeekContaining(new Date());
  const weekMonday = new Date(monday);
  weekMonday.setDate(monday.getDate() + (weekIndex - 1) * 7);
  const weekRange = formatPlannerWeekRange(weekMonday);

  const marginL = 8;
  const marginR = 8;
  const marginT = 12;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentRight = pageWidth - marginR;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(marginL, marginT + 4, contentRight, marginT + 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("VREMA Schichtplan", marginL, marginT - 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(pdfHeaderFirmenzeile(companyName), marginL, marginT);
  doc.text(`Woche ${weekIndex} von ${shiftCycleWeeks} · ${pdfSafe(weekRange)}`, contentRight, marginT - 4, {
    align: "right",
  });
  doc.setFontSize(8);
  const created = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Erstellt: ${created}`, contentRight, marginT, { align: "right" });

  const head = [
    "Mitarbeiter",
    ...PLANNER_DAYS_MON_FIRST.map((d) => dayColumnHeader(weekIndex, d)),
  ];

  const body =
    sortedMembers.length === 0
      ? [["—", ...PLANNER_DAYS_MON_FIRST.map(() => "—")]]
      : sortedMembers.map((m) => {
          const label = m.area?.trim()
            ? `${pdfSafe(m.name)}\n(${pdfSafe(m.area.trim())})`
            : pdfSafe(m.name);
          return [
            label,
            ...PLANNER_DAYS_MON_FIRST.map((d) => {
              const shift = shiftByUserDay.get(`${m.id}-${d}`);
              return shift ? formatShiftCell(shift) : "—";
            }),
          ];
        });

  autoTable(doc, {
    startY: marginT + 8,
    margin: { left: marginL, right: marginR },
    head: [head],
    body,
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.5,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [15, 118, 110],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: "bold", halign: "left" },
      1: { halign: "center", cellWidth: 28 },
      2: { halign: "center", cellWidth: 28 },
      3: { halign: "center", cellWidth: 28 },
      4: { halign: "center", cellWidth: 28 },
      5: { halign: "center", cellWidth: 28 },
      6: { halign: "center", cellWidth: 28 },
      7: { halign: "center", cellWidth: 28 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Seite ${data.pageNumber} / ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 6,
        { align: "center" },
      );
    },
  });

  const safeCompany = pdfSafe(companyName.trim() || "betrieb")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .slice(0, 24)
    .toLowerCase();
  return {
    doc,
    fileName: `schichtplan-${safeCompany}-woche-${weekIndex}.pdf`,
  };
}
