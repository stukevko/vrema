import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { pdfAsciiSafe, payrollDocumentTitle } from "@/lib/exports/payroll-formats";
import {
  dateForPlannerCycleDay,
  dayOrderMonFirst,
  formatPlannerWeekRange,
  isoFromPlannerDate,
  monthYearLabel,
  mondayOfWeekContaining,
} from "@/lib/planning/cycle-display-date";
import { getWeekCycleIndex, type ShiftCycleWeeks } from "@/lib/shift-cycle";

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

const pdfSafe = pdfAsciiSafe;

function formatTimeCompactForPdf(value: string): string {
  const m = value.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return value.slice(0, 5);
  const h = Number(m[1]);
  const min = m[2];
  if (min === "00") return String(h);
  return `${h}:${min}`;
}

function formatShiftCell(shift: ShiftPlanPdfShift): string {
  const start = formatTimeCompactForPdf(shift.startTime);
  const end = formatTimeCompactForPdf(shift.endTime);
  const br = Math.max(0, shift.breakDuration ?? 0);
  if (br > 0) return `${start}-${end}\nP ${br}m`;
  return `${start}-${end}`;
}

/** Für Tests — kompakte Zellen-Darstellung im PDF. */
export function formatPdfShiftCell(shift: ShiftPlanPdfShift): string {
  return formatShiftCell(shift);
}

function formatShiftCells(shifts: ShiftPlanPdfShift[]): string {
  if (shifts.length === 0) return "—";
  return shifts.map(formatShiftCell).join("\n");
}

/** Alle Kalendertage eines Monats (lokal, Mittags — DST-sicher). */
export function monthDaysInAnchor(monthAnchor: Date): Date[] {
  const y = monthAnchor.getFullYear();
  const m = monthAnchor.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  const days: Date[] = [];
  for (let d = 1; d <= lastDay; d++) {
    days.push(new Date(y, m, d, 12, 0, 0, 0));
  }
  return days;
}

/** Schichten pro Mitarbeiter und Kalendertag (ISO) im Monat. */
export function buildShiftsByUserIsoForMonth(
  monthDays: Date[],
  shiftCycleWeeks: ShiftCycleWeeks,
  shifts: ShiftPlanPdfShift[],
): Map<string, ShiftPlanPdfShift[]> {
  const map = new Map<string, ShiftPlanPdfShift[]>();
  for (const date of monthDays) {
    const weekIndex = getWeekCycleIndex(date, shiftCycleWeeks);
    const dow = date.getDay();
    const iso = isoFromPlannerDate(date);
    for (const shift of shifts) {
      if (Number.isNaN(shift.dayOfWeek)) continue;
      if (shift.weekIndex !== weekIndex || shift.dayOfWeek !== dow) continue;
      const key = `${shift.userId}-${iso}`;
      const list = map.get(key) ?? [];
      list.push(shift);
      map.set(key, list);
    }
  }
  return map;
}

function countMonthShiftSlots(map: Map<string, ShiftPlanPdfShift[]>): number {
  let n = 0;
  for (const list of map.values()) n += list.length;
  return n;
}

function dayColumnHeaderFromDate(date: Date): string {
  const dateLine = date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  return `${DAY_SHORT[date.getDay()]}\n${dateLine}`;
}

function drawPlanPdfHeader(params: {
  doc: jsPDF;
  companyName: string;
  titleLine: string;
  subtitleLine: string;
  marginL: number;
  marginR: number;
  marginT: number;
}) {
  const { doc, companyName, titleLine, subtitleLine, marginL, marginR, marginT } = params;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentRight = pageWidth - marginR;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(marginL, marginT + 4, contentRight, marginT + 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("Schichtplan", marginL, marginT - 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("· VREMA", marginL + 26, marginT - 4);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.text(pdfHeaderFirmenzeile(companyName), marginL, marginT);
  doc.text(pdfSafe(titleLine), contentRight, marginT - 4, { align: "right" });
  doc.setFontSize(8);
  const created = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`${pdfSafe(subtitleLine)} · Erstellt: ${created}`, contentRight, marginT, { align: "right" });
}

function safeCompanySlug(companyName: string): string {
  return pdfSafe(companyName.trim() || "betrieb")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .slice(0, 24)
    .toLowerCase();
}

/** Halbmonat pro Seite — besser lesbar auf A4 quer als 30 Spalten. */
export const HALF_MONTH_PDF_DAYS = 15;

/** Mindestbreite pro Tag-Spalte (mm). */
const MIN_DAY_COL_MM = 11.5;

export function chunkMonthDaysForPdf(
  monthDays: Date[],
  contentWidth: number,
  nameColWidth: number,
): Date[][] {
  if (monthDays.length > HALF_MONTH_PDF_DAYS) {
    const first = monthDays.slice(0, HALF_MONTH_PDF_DAYS);
    const second = monthDays.slice(HALF_MONTH_PDF_DAYS);
    return second.length > 0 ? [first, second] : [first];
  }
  const maxDaysPerPage = Math.max(
    7,
    Math.floor((contentWidth - nameColWidth) / MIN_DAY_COL_MM),
  );
  if (monthDays.length <= maxDaysPerPage) return [monthDays];
  const chunks: Date[][] = [];
  for (let i = 0; i < monthDays.length; i += maxDaysPerPage) {
    chunks.push(monthDays.slice(i, i + maxDaysPerPage));
  }
  return chunks;
}

/** Seiten durch Tages-Split (ohne vertikale MA-Umbrüche). */
export function estimateMonthPdfDayPages(monthDayCount: number): number {
  if (monthDayCount <= HALF_MONTH_PDF_DAYS) return 1;
  return Math.ceil(monthDayCount / HALF_MONTH_PDF_DAYS);
}

export function resolveExportMembers(
  members: ShiftPlanPdfMember[],
  monthDays: Date[],
  shiftCycleWeeks: ShiftCycleWeeks,
  shifts: ShiftPlanPdfShift[],
): ShiftPlanPdfMember[] {
  const byId = new Map<string, ShiftPlanPdfMember>();
  for (const m of members) {
    if (m.name.trim().length > 0) byId.set(m.id, m);
  }
  for (const date of monthDays) {
    const weekIndex = getWeekCycleIndex(date, shiftCycleWeeks);
    const dow = date.getDay();
    for (const shift of shifts) {
      if (Number.isNaN(shift.dayOfWeek)) continue;
      if (shift.weekIndex !== weekIndex || shift.dayOfWeek !== dow) continue;
      if (!byId.has(shift.userId)) {
        byId.set(shift.userId, { id: shift.userId, name: "Mitarbeiter", area: null });
      }
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "de-DE"));
}

function drawPdfPageFooters(doc: jsPDF, _marginL: number, _marginR: number) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Seite ${page} / ${pageCount}`, pageWidth / 2, pageHeight - 6, { align: "center" });
  }
  doc.setTextColor(0, 0, 0);
}

function pdfHeaderFirmenzeile(companyName: string): string {
  return pdfSafe(payrollDocumentTitle(companyName));
}

function dayColumnHeader(weekIndex: ShiftCycleWeeks, dayOfWeek: number): string {
  const d = dateForPlannerCycleDay(weekIndex, dayOfWeek);
  return dayColumnHeaderFromDate(d);
}

export function buildShiftPlanMonthPdf(input: {
  companyName: string;
  monthAnchor: Date;
  shiftCycleWeeks: ShiftCycleWeeks;
  members: ShiftPlanPdfMember[];
  shifts: ShiftPlanPdfShift[];
}): { doc: jsPDF; fileName: string } {
  const { companyName, monthAnchor, shiftCycleWeeks, members, shifts } = input;
  const monthDays = monthDaysInAnchor(monthAnchor);
  const shiftByUserIso = buildShiftsByUserIsoForMonth(monthDays, shiftCycleWeeks, shifts);
  const sortedMembers = resolveExportMembers(members, monthDays, shiftCycleWeeks, shifts);

  const marginL = 8;
  const marginR = 8;
  const marginT = 12;
  const marginB = 10;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginL - marginR;
  const monthLabel = monthYearLabel(monthAnchor);
  const totalShifts = countMonthShiftSlots(shiftByUserIso);

  const nameColWidth = 36;
  const dayChunks = chunkMonthDaysForPdf(monthDays, contentWidth, nameColWidth);

  dayChunks.forEach((chunk, chunkIndex) => {
    if (chunkIndex > 0) doc.addPage();
    const rangeLabel =
      chunk.length === 1
        ? chunk[0]!.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
        : `${chunk[0]!.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}–${chunk[chunk.length - 1]!.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}`;

    drawPlanPdfHeader({
      doc,
      companyName,
      titleLine: monthLabel,
      subtitleLine:
        dayChunks.length > 1
          ? `${rangeLabel} · ${sortedMembers.length} Pers. · ${totalShifts} Schichten`
          : `${sortedMembers.length} Pers. · ${totalShifts} Schichten`,
      marginL,
      marginR,
      marginT,
    });

    const dayColWidth = (contentWidth - nameColWidth) / chunk.length;
    const dataRowCount = Math.max(1, sortedMembers.length);
    const tableTop = marginT + 8;
    const availableHeight = pageHeight - tableTop - marginB;
    const fontSize = Math.min(
      8.5,
      Math.max(7, availableHeight / (dataRowCount + 2) / 2.4),
    );
    const cellPadding = Math.min(3, Math.max(1.5, fontSize / 3));

    const head = ["Mitarbeiter", ...chunk.map((d) => dayColumnHeaderFromDate(d))];
    const body =
      sortedMembers.length === 0
        ? [["Kein Team eingetragen", ...chunk.map(() => "—")]]
        : sortedMembers.map((m) => {
            const label = m.area?.trim()
              ? `${pdfSafe(m.name)}\n(${pdfSafe(m.area.trim())})`
              : pdfSafe(m.name);
            return [
              label,
              ...chunk.map((d) => {
                const iso = isoFromPlannerDate(d);
                return formatShiftCells(shiftByUserIso.get(`${m.id}-${iso}`) ?? []);
              }),
            ];
          });

    const columnStyles: Record<number, { halign: "left" | "center"; cellWidth: number; fontStyle?: "bold" }> = {
      0: { cellWidth: nameColWidth, fontStyle: "bold", halign: "left" },
    };
    chunk.forEach((_, idx) => {
      columnStyles[idx + 1] = { halign: "center", cellWidth: dayColWidth };
    });

    autoTable(doc, {
      startY: tableTop,
      tableWidth: contentWidth,
      margin: { left: marginL, right: marginR, bottom: marginB },
      head: [head],
      body,
      styles: {
        font: "helvetica",
        fontSize,
        cellPadding,
        overflow: "linebreak",
        valign: "middle",
        lineWidth: 0.1,
        lineColor: [203, 213, 225],
      },
      headStyles: {
        fillColor: [15, 118, 110],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: Math.max(5.5, fontSize - 0.5),
        halign: "center",
      },
      columnStyles,
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
  });

  drawPdfPageFooters(doc, marginL, marginR);

  const y = monthAnchor.getFullYear();
  const mo = String(monthAnchor.getMonth() + 1).padStart(2, "0");
  return {
    doc,
    fileName: `schichtplan-${safeCompanySlug(companyName)}-${y}-${mo}.pdf`,
  };
}

export function buildShiftPlanPdf(input: {
  companyName: string;
  weekIndex: ShiftCycleWeeks;
  shiftCycleWeeks: ShiftCycleWeeks;
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

  drawPlanPdfHeader({
    doc,
    companyName,
    titleLine: `Woche ${weekIndex} von ${shiftCycleWeeks} · ${pdfSafe(weekRange)}`,
    subtitleLine: `${sortedMembers.length} Pers. · ${weekShifts.length} Schichten`,
    marginL,
    marginR,
    marginT,
  });

  const head = [
    "Mitarbeiter",
    ...PLANNER_DAYS_MON_FIRST.map((d) => dayColumnHeader(weekIndex, d)),
  ];

  const shiftsInWeek = weekShifts.length;

  const body =
    sortedMembers.length === 0
      ? [["Kein Team eingetragen", ...PLANNER_DAYS_MON_FIRST.map(() => "—")]]
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

  if (shiftsInWeek === 0 && sortedMembers.length > 0) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "Hinweis: In dieser Woche sind noch keine Schichten eingetragen.",
      marginL,
      marginT + 7,
    );
  }

  autoTable(doc, {
    startY: marginT + (shiftsInWeek === 0 && sortedMembers.length > 0 ? 11 : 8),
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

  return {
    doc,
    fileName: `schichtplan-${safeCompanySlug(companyName)}-woche-${weekIndex}.pdf`,
  };
}
