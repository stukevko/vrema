"use client";

import { motion } from "framer-motion";
import { FileText, Mail, Clock, Lock, Download, FileSpreadsheet, Sparkles } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createWorkLogCorrectionRequest,
  decideWorkLogCorrectionRequest,
  deleteWorkLogByManager,
  updateWorkLogByManager,
} from "@/lib/actions/worklogs";
import { sendPayrollReportEmail } from "@/lib/actions/emails";
import { minutesToDecimalHours, workedMinutes } from "@/lib/time/payroll";
import type { AIReportAnalysisPayload } from "@/lib/ai/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type CorrectionRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

type LogRow = {
  id: string;
  userId: string;
  userName: string;
  employeeNumber: string;
  weeklyHours: number;
  clockIn: string;
  clockOut: string | null;
  breakMins: number;
  status: "ON_TIME" | "LATE" | "ABSENT" | "MANUAL_ADJUSTED";
  note: string | null;
};

interface Props {
  logs: LogRow[];
  totalMinutes: number;
  month: string;
  monthKey: string;
  plan: string;
  isManager: boolean;
  companyName: string;
  monthlySollMinutesByUser: Record<string, number>;
  absences: Array<{
    userId: string;
    startDate: string;
    endDate: string;
    type: "VACATION" | "SICK";
  }>;
  correctionRequests: Array<{
    id: string;
    workLogId: string | null;
    userId: string;
    userName: string;
    requestedClockIn: string;
    requestedClockOut: string | null;
    requestedBreakMins: number;
    requestedNote: string | null;
    reason: string;
    status: CorrectionRequestStatus;
    reviewerName: string | null;
  }>;
}

function formatMins(mins: number) {
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.floor(Math.abs(mins) % 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function durationMins(row: LogRow) {
  if (!row.clockOut) return null;
  return workedMinutes({ clockIn: row.clockIn, clockOut: row.clockOut, breakMins: row.breakMins });
}

function buildReportAnalysisFromFacts(params: {
  month: string;
  totalMinutes: number;
  totalEntries: number;
  avgBreakMins: number;
  correctionNeeds: number;
}): AIReportAnalysisPayload {
  const totalHours = minutesToDecimalHours(params.totalMinutes, 2);
  const avgBreakLabel = `${Math.round(params.avgBreakMins)} Min`;

  return {
    generatedAt: new Date().toISOString(),
    summary:
      `Für ${params.month} wurden ${totalHours} Stunden in ${params.totalEntries} Einträgen dokumentiert. ` +
      `Die durchschnittliche Pausendauer liegt bei ${avgBreakLabel}, mit ${params.correctionNeeds} Korrekturbedarfen im Zeitraum.`,
    highlights: [
      `Gesamtstunden: ${totalHours} h`,
      `Durchschnittliche Pausendauer: ${avgBreakLabel}`,
      `Korrekturbedarfe im Zeitraum: ${params.correctionNeeds}`,
    ],
  };
}

function decimalHoursDE(minutes: number): string {
  return minutesToDecimalHours(minutes, 2).replace(".", ",");
}

function toCsvCell(value: string | number) {
  const text = String(value ?? "");
  if (text === "") return "";
  const needsQuotes = /[;"\n\r]/.test(text);
  if (!needsQuotes) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function formatDateDE(value: Date) {
  return value.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Striktes TT.MM.JJJJ für Lohn-/DATEV-Exporte (unabhängig von Browser-Locale-Details). */
function formatDateCsv(value: Date) {
  const d = value.getDate().toString().padStart(2, "0");
  const m = (value.getMonth() + 1).toString().padStart(2, "0");
  const y = value.getFullYear();
  return `${d}.${m}.${y}`;
}

function formatTimeCsv(value: Date) {
  return value.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function employeeNumberOrFallback(log: LogRow) {
  if (log.employeeNumber && log.employeeNumber.trim()) return log.employeeNumber.trim();
  return `MA-${log.userId.slice(-6).toUpperCase()}`;
}

function formatForDateTimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultDatevAbrechnungsmonatMMYYYY() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `${mm}/${yyyy}`;
}

/** PDF-Kopf: Mandantenname oder neutraler VREMA-Titel (ohne Hersteller-Branding in der Kopfzeile). */
function pdfHeaderFirmenzeile(companyName: string) {
  const t = companyName.trim();
  if (!t) return "VREMA Report";
  if (/^kevkostudio$/i.test(t)) return "VREMA Report";
  return t;
}

function statusLabel(status: LogRow["status"]) {
  if (status === "ON_TIME") return "Pünktlich";
  if (status === "LATE") return "Zu spät";
  if (status === "ABSENT") return "Fehlend";
  return "Manuell";
}

function PlanGateButton({
  icon: Icon,
  label,
  plan,
  requiredPlan,
  onLockedClick,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  plan: string;
  requiredPlan: string;
  onLockedClick: () => void;
  onClick?: () => void;
}) {
  const hasAccess = plan === requiredPlan || plan === "ENTERPRISE" || (requiredPlan === "BUSINESS" && plan === "ENTERPRISE");
  const locked = !hasAccess;

  return (
    <button
      type="button"
      onClick={locked ? onLockedClick : onClick}
      className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-all active:scale-[0.99] sm:w-auto sm:py-2.5 ${
        locked
          ? "cursor-pointer border-border bg-card text-muted-foreground md:hover:bg-muted/50"
          : "border-border bg-white text-foreground md:hover:bg-muted/50"
      }`}
    >
      {locked ? <Lock className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

export function ReportsClient({
  logs,
  totalMinutes,
  month,
  monthKey,
  plan,
  isManager,
  companyName,
  monthlySollMinutesByUser,
  absences,
  correctionRequests,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toasts, show, remove } = useToast();
  const [isSaving, startTransition] = useTransition();
  const [isRoutePending, startRouteTransition] = useTransition();
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [showDatevModal, setShowDatevModal] = useState(false);
  const [payrollEmail, setPayrollEmail] = useState("");
  const [requestMode, setRequestMode] = useState<"existing" | "new">("existing");
  const [requestLogId, setRequestLogId] = useState("");
  const [requestClockIn, setRequestClockIn] = useState("");
  const [requestClockOut, setRequestClockOut] = useState("");
  const [requestBreakMins, setRequestBreakMins] = useState("0");
  const [requestReason, setRequestReason] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [editingLog, setEditingLog] = useState<LogRow | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [editBreakMins, setEditBreakMins] = useState("0");
  const [editStatus, setEditStatus] = useState<LogRow["status"]>("MANUAL_ADJUSTED");
  const [editNote, setEditNote] = useState("");
  const [editReason, setEditReason] = useState("");

  const lockedMsg = () => show("Upgrade erforderlich", "info");

  // DATEV-Konfiguration (später aus Company-Settings; aktuell lokal im Client-State)
  const [beraterNummer, setBeraterNummer] = useState("");
  const [mandantenNummer, setMandantenNummer] = useState("");
  const [abrechnungsMonat, setAbrechnungsMonat] = useState(() => defaultDatevAbrechnungsmonatMMYYYY());
  const [isDatevDownloading, setIsDatevDownloading] = useState(false);
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
  const [aiAnalysis, setAIAnalysis] = useState<AIReportAnalysisPayload | null>(null);
  const hasBusinessAccess = plan === "BUSINESS" || plan === "ENTERPRISE";
  const totalHoursDecimal = minutesToDecimalHours(totalMinutes, 2);
  const productiveDays = new Set(logs.map((log) => new Date(log.clockIn).toDateString())).size;
  const avgHoursPerDay = productiveDays > 0 ? minutesToDecimalHours(totalMinutes / productiveDays, 2) : "0.00";
  const indicativeCosts = Number.parseFloat(totalHoursDecimal) * 29;
  const monthOptions = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const d = new Date(base.getFullYear(), base.getMonth() - index, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
      return { key, label: label.charAt(0).toUpperCase() + label.slice(1) };
    });
  }, []);

  const byUser = logs.reduce<Record<string, LogRow[]>>((acc, log) => {
    if (!acc[log.userId]) acc[log.userId] = [];
    acc[log.userId].push(log);
    return acc;
  }, {});

  const istMinutesByUser = logs.reduce<Record<string, number>>((acc, log) => {
    const d = durationMins(log);
    if (d === null || d < 0) return acc;
    acc[log.userId] = (acc[log.userId] ?? 0) + Math.round(d);
    return acc;
  }, {});

  const absencesByUser = absences.reduce<Record<string, Props["absences"]>>((acc, entry) => {
    if (!acc[entry.userId]) acc[entry.userId] = [];
    acc[entry.userId].push(entry);
    return acc;
  }, {});

  const buildPdfDocAndName = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const drawHeader = () => {
      doc.setFillColor(16, 16, 16);
      doc.rect(0, 0, pageWidth, 24, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text("VREMA", 10, 11);
      doc.setFontSize(10);
      doc.text(pdfHeaderFirmenzeile(companyName), pageWidth / 2, 11, { align: "center" });
      doc.text(month, pageWidth - 10, 11, { align: "right" });
      doc.setFontSize(8);
      doc.setTextColor(210, 210, 210);
      doc.text(`Gesamtstunden Firma: ${decimalHoursDE(totalMinutes)}h`, 10, 18);
      doc.text(`Mitarbeiter im Report: ${Object.keys(byUser).length}`, 70, 18);
      doc.text(`Einträge: ${logs.length}`, pageWidth - 10, 18, { align: "right" });
      doc.setTextColor(20, 20, 20);
    };
    drawHeader();

    const users = Object.values(byUser)
      .filter((arr) => arr.length > 0)
      .sort((a, b) => a[0].userName.localeCompare(b[0].userName, "de-DE"));

    let firstSection = true;
    users.forEach((userLogs, sectionIndex) => {
      if (!firstSection) {
        doc.addPage();
        drawHeader();
      }
      firstSection = false;

      const first = userLogs[0];
      const userIst = istMinutesByUser[first.userId] ?? 0;
      const userSoll = monthlySollMinutesByUser[first.userId] ?? Math.round(first.weeklyHours * 60 * 4.33);
      const diff = userIst - userSoll;
      const ratio = userSoll > 0 ? Math.max(0, Math.min(1, userIst / userSoll)) : 0;
      const sectionStartY = 30;
      doc.setFillColor(236, 253, 245);
      doc.rect(10, sectionStartY, pageWidth - 20, 12, "F");
      doc.setFontSize(11);
      doc.text(`${first.userName}${first.employeeNumber ? ` (#${first.employeeNumber})` : ""}`, 12, sectionStartY + 7.5);
      doc.setFontSize(9);
      doc.text(
        `Ist ${decimalHoursDE(userIst)}h | Soll ${decimalHoursDE(userSoll)}h | Differenz ${decimalHoursDE(diff)}h`,
        pageWidth - 12,
        sectionStartY + 7.5,
        { align: "right" }
      );
      doc.setDrawColor(170);
      doc.rect(12, sectionStartY + 9, 58, 2.8);
      doc.setFillColor(34, 197, 94);
      doc.rect(12, sectionStartY + 9, 58 * ratio, 2.8, "F");

      const weekBuckets = new Map<string, number>();
      const sortedLogs = userLogs
        .slice()
        .sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime())
        .map((log) => {
          const inAt = new Date(log.clockIn);
          const outAt = log.clockOut ? new Date(log.clockOut) : null;
          const dur = durationMins(log);
          const netMin = dur !== null ? Math.round(dur) : null;
          const week = `${inAt.getFullYear()}-${Math.ceil((inAt.getDate() + new Date(inAt.getFullYear(), inAt.getMonth(), 1).getDay()) / 7)}`;
          if (dur && dur > 0) weekBuckets.set(week, (weekBuckets.get(week) ?? 0) + Math.round(dur));
          return [
            formatDateCsv(inAt),
            formatTimeCsv(inAt),
            outAt ? formatTimeCsv(outAt) : "—",
            log.breakMins,
            netMin !== null ? netMin : "—",
            netMin !== null ? decimalHoursDE(netMin) : "—",
            statusLabel(log.status),
            log.note ?? "",
          ];
        });

      autoTable(doc, {
        startY: sectionStartY + 15,
        head: [
          [
            "Datum",
            "Einstempelzeit",
            "Ausstempelzeit",
            "Pause (Minuten)",
            "Arbeitszeit netto (Minuten)",
            "Stunden (Dezimal)",
            "Status",
            "Bemerkung",
          ],
        ],
        body: sortedLogs,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 1.4, lineColor: [220, 220, 220], lineWidth: 0.1 },
        headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 22 },
          2: { cellWidth: 22 },
          3: { cellWidth: 16 },
          4: { cellWidth: 26 },
          5: { cellWidth: 22 },
          6: { cellWidth: 22 },
          7: { cellWidth: "auto" },
        },
        didParseCell: (data) => {
          if (data.section !== "body" || data.column.index !== 6) return;
          const raw = String(data.cell.raw ?? "");
          if (raw.includes("Zu spät") || raw.includes("Fehlend")) {
            data.cell.styles.textColor = [180, 0, 0];
            data.cell.styles.fontStyle = "bold";
          } else if (raw.includes("Pünktlich")) {
            data.cell.styles.textColor = [0, 120, 50];
          }
        },
      });

      const afterTableY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? (sectionStartY + 80);
      const userAbsences = absencesByUser[first.userId] ?? [];
      let y = afterTableY + 6;
      if (userAbsences.length) {
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        const list = userAbsences
          .map((a) => {
            const s = formatDateCsv(new Date(a.startDate));
            const e = formatDateCsv(new Date(a.endDate));
            return `${a.type === "SICK" ? "Krank" : "Urlaub"} ${s}${s === e ? "" : ` – ${e}`}`;
          })
          .join(" | ");
        doc.text(`Abwesenheiten: ${list}`, 11, y);
        doc.setTextColor(15, 15, 15);
        y += 5;
      }

      Array.from(weekBuckets.entries()).forEach(([week, mins]) => {
        if (y > pageHeight - 28) return;
        doc.setFontSize(8);
        doc.text(`Wochensumme ${week}: ${formatMins(mins)}`, 11, y);
        y += 4.5;
      });
      const signY = Math.min(pageHeight - 18, y + 8);
      doc.setDrawColor(130);
      doc.line(20, signY, 95, signY);
      doc.line(115, signY, 190, signY);
      doc.setFontSize(8);
      doc.text("Datum / Unterschrift Mitarbeiter", 20, signY + 4.5);
      doc.text("Datum / Unterschrift Vorgesetzter", 115, signY + 4.5);
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(`Seite ${sectionIndex + 1} von ${users.length}`, pageWidth - 12, pageHeight - 6, { align: "right" });
      doc.setTextColor(15, 15, 15);
    });

    const safeMonth = month.replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
    return { doc, fileName: `vrema-report-${safeMonth || "monat"}.pdf` };
  };
  const exportPdf = () => {
    const { doc, fileName } = buildPdfDocAndName();
    doc.save(fileName);
  };
  const buildCsv = () => {
    const separator = ";";
    const personalHeaders = isManager ? (["Mitarbeiter-Nr", "Mitarbeiter Name"] as const) : [];
    const headers = [
      ...personalHeaders,
      "Zeilenart",
      "Datum",
      "Einstempelzeit",
      "Ausstempelzeit",
      "Pause (Minuten)",
      "Arbeitszeit netto (Minuten)",
      "Stunden (Dezimal)",
      "Lohnart-Code",
      "Lohnart-Bezeichnung",
      "Sollzeit Monat (Std)",
      "Istzeit Monat (Std)",
      "Differenz (Std)",
      "Status",
      "Bemerkung",
    ];

    const personalCells = (nr: string, name: string) => (isManager ? [nr, name] : []);

    const users = Object.values(byUser)
      .filter((arr) => arr.length > 0)
      .sort((a, b) => a[0].userName.localeCompare(b[0].userName, "de-DE"));

    const rows: Array<Array<string | number>> = [];
    users.forEach((userLogs) => {
      const sortedLogs = userLogs
        .slice()
        .sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime());
      const first = sortedLogs[0];
      const mitarbeiterNr = employeeNumberOrFallback(first);
      const userIst = istMinutesByUser[first.userId] ?? 0;
      const userSoll = monthlySollMinutesByUser[first.userId] ?? Math.round(first.weeklyHours * 60 * 4.33);
      const diff = userIst - userSoll;

      sortedLogs.forEach((log) => {
        const inAt = new Date(log.clockIn);
        const outAt = log.clockOut ? new Date(log.clockOut) : null;
        const dur = durationMins(log);
        const netMin = dur !== null ? Math.round(dur) : "";
        const dezStd = netMin !== "" ? decimalHoursDE(Number(netMin)) : "";
        rows.push([
          ...personalCells(mitarbeiterNr, log.userName),
          "Arbeitstag",
          formatDateCsv(inAt),
          formatTimeCsv(inAt),
          outAt ? formatTimeCsv(outAt) : "",
          log.breakMins,
          netMin,
          dezStd,
          "001",
          "Arbeitszeit",
          "",
          "",
          "",
          statusLabel(log.status),
          log.note ?? "",
        ]);
      });

      const userAbsences = (absencesByUser[first.userId] ?? []).slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
      userAbsences.forEach((a) => {
        const s = new Date(a.startDate);
        const e = new Date(a.endDate);
        const absenceNote = s.getTime() === e.getTime() ? "" : `bis ${formatDateCsv(e)}`;
        rows.push([
          ...personalCells(mitarbeiterNr, first.userName),
          "Abwesenheit",
          formatDateCsv(s),
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          a.type === "SICK" ? "Krank" : "Urlaub",
          absenceNote,
        ]);
      });

      rows.push([
        ...personalCells(mitarbeiterNr, first.userName),
        "Summe Monat",
        "",
        "",
        "",
        "",
        "",
        "",
        "001",
        "Arbeitszeit",
        decimalHoursDE(userSoll),
        decimalHoursDE(userIst),
        decimalHoursDE(diff),
        "Monatssumme (Ist − Soll)",
        "",
      ]);
      if (diff > 0) {
        rows.push([
          ...personalCells(mitarbeiterNr, first.userName),
          "Überstunden",
          "",
          "",
          "",
          "",
          diff,
          decimalHoursDE(diff),
          "002",
          "Überstunden",
          "",
          "",
          "",
          "Positiver Saldo gegenüber Sollzeit",
          "",
        ]);
      }
    });

    const csv = [
      headers.map(toCsvCell).join(separator),
      ...rows.map((row) => row.map((cell) => toCsvCell(cell)).join(separator)),
    ].join("\n");
    return csv;
  };
  const sendToPayroll = () => {
    setPayrollEmail("");
    setShowPayrollModal(true);
  };
  const confirmSendToPayroll = () => {
    const recipientEmail = payrollEmail.trim();
    if (!recipientEmail) {
      show("Bitte eine E-Mail-Adresse eingeben.", "error");
      return;
    }
    const { doc, fileName } = buildPdfDocAndName();
    const pdfArrayBuffer = doc.output("arraybuffer");
    const bytes = new Uint8Array(pdfArrayBuffer);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    const pdfBase64 = btoa(binary);
    startTransition(async () => {
      try {
        await sendPayrollReportEmail({
          recipientEmail,
          companyName,
          month,
          totalHours: decimalHoursDE(totalMinutes),
          entries: logs.length,
          attachmentFileName: fileName,
          attachmentBase64: pdfBase64,
          attachmentMimeType: "application/pdf",
          attachmentLabel: "PDF-Report",
        });
        show(`PDF-Report wurde erfolgreich an ${recipientEmail} versendet.`, "success");
        setShowPayrollModal(false);
      } catch (err: unknown) {
        show(err instanceof Error ? err.message : "Die Aktion konnte nicht abgeschlossen werden. Bitte erneut versuchen.", "error");
      }
    });
  };
  const exportCsv = () => {
    const csv = buildCsv();

    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeMonth = month.replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
    link.href = url;
    link.download = `vrema-report-${safeMonth || "monat"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const buildDatevCsv = (config: { beraterNummer: string; mandantenNummer: string; abrechnungsMonat: string }) => {
    // Basis: gleicher Lohn-CSV wie User-Export (Datum TT.MM.JJJJ; Stunden mit Komma).
    // DATEV: Berater-, Mandantennummer und Abrechnungsmonat als erste Spalten (Stammdaten vor Personaldaten).
    const baseCsv = buildCsv();
    const separator = ";";
    const [headerLine, ...dataLines] = baseCsv.split("\n");

    const headerPrefix = ["Beraternummer", "Mandantennummer", "Abrechnungsmonat"]
      .map((v) => toCsvCell(v))
      .join(separator);

    const prefixValues = [config.beraterNummer, config.mandantenNummer, config.abrechnungsMonat]
      .map((v) => toCsvCell(v))
      .join(separator);

    return [
      `${headerPrefix}${separator}${headerLine}`,
      ...dataLines
        .filter((l) => l.trim().length > 0)
        .map((line) => `${prefixValues}${separator}${line}`),
    ].join("\n");
  };

  const exportDatevLohnCsv = () => {
    const csv = buildDatevCsv({
      beraterNummer: beraterNummer.trim(),
      mandantenNummer: mandantenNummer.trim(),
      abrechnungsMonat: abrechnungsMonat.trim(),
    });

    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeDatevMonth = abrechnungsMonat.replace(/\//g, "-").replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
    link.href = url;
    link.download = `vrema-datev-lohn-${safeDatevMonth || "monat"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const confirmDatevExport = () => {
    const m = abrechnungsMonat.trim();
    if (!m) {
      show("Bitte einen Abrechnungsmonat angeben.", "error");
      return;
    }

    setIsDatevDownloading(true);
    try {
      exportDatevLohnCsv();
      show("DATEV-CSV wurde heruntergeladen.", "success");
      setShowDatevModal(false);
    } catch (err: unknown) {
      show(err instanceof Error ? err.message : "Die Aktion konnte nicht abgeschlossen werden. Bitte erneut versuchen.", "error");
    } finally {
      setIsDatevDownloading(false);
    }
  };

  const handleEdit = (log: LogRow) => {
    setEditingLog(log);
    setEditClockIn(formatForDateTimeLocal(log.clockIn));
    setEditClockOut(log.clockOut ? formatForDateTimeLocal(log.clockOut) : "");
    setEditBreakMins(String(log.breakMins ?? 0));
    setEditStatus(log.status);
    setEditNote(log.note ?? "");
    setEditReason("");
  };
  const submitEdit = () => {
    if (!editingLog) return;
    if (!editClockIn || !editReason.trim()) {
      show("Bitte Einstempelzeit und Grund angeben.", "error");
      return;
    }
    startTransition(async () => {
      try {
        await updateWorkLogByManager({
          logId: editingLog.id,
          clockIn: new Date(editClockIn).toISOString(),
          clockOut: editClockOut ? new Date(editClockOut).toISOString() : null,
          breakMins: Number.parseInt(editBreakMins || "0", 10),
          note: editNote,
          status: editStatus,
          editReason: editReason.trim(),
        });
        show("Eintrag aktualisiert und protokolliert.", "success");
        setEditingLog(null);
      } catch (err: unknown) {
        show(err instanceof Error ? err.message : "Die Aktion konnte nicht abgeschlossen werden. Bitte erneut versuchen.", "error");
      }
    });
  };
  const handleAbsentOverride = (log: LogRow) => {
    const next = window.prompt(
      "Neuer Status: ON_TIME | LATE | MANUAL_ADJUSTED",
      log.status === "ABSENT" ? "MANUAL_ADJUSTED" : log.status
    );
    if (!next) return;
    const reason = window.prompt("Grund der manuellen Korrektur (Pflicht)");
    if (!reason || !reason.trim()) {
      show("Korrekturgrund ist erforderlich.", "error");
      return;
    }
    if (!["ON_TIME", "LATE", "MANUAL_ADJUSTED"].includes(next)) {
      show("Ungültiger Status.", "error");
      return;
    }
    startTransition(async () => {
      try {
        await updateWorkLogByManager({
          logId: log.id,
          status: next as "ON_TIME" | "LATE" | "MANUAL_ADJUSTED",
          note: (log.note ? `${log.note} | ` : "") + "[MANUAL_OVERRIDE]",
          editReason: reason.trim(),
        });
        show("ABSENT-Eintrag korrigiert.", "success");
      } catch (err: unknown) {
        show(err instanceof Error ? err.message : "Die Aktion konnte nicht abgeschlossen werden. Bitte erneut versuchen.", "error");
      }
    });
  };

  const handleDelete = (log: LogRow) => {
    const reason = window.prompt("Grund der Löschung (Pflicht)");
    if (!reason || !reason.trim()) {
      show("Löschgrund ist erforderlich.", "error");
      return;
    }
    startTransition(async () => {
      try {
        await deleteWorkLogByManager(log.id, reason.trim());
        show("Eintrag gelöscht.", "success");
      } catch (err: unknown) {
        show(err instanceof Error ? err.message : "Die Aktion konnte nicht abgeschlossen werden. Bitte erneut versuchen.", "error");
      }
    });
  };

  const prefillFromLog = (log: LogRow) => {
    setRequestLogId(log.id);
    setRequestClockIn(formatForDateTimeLocal(log.clockIn));
    setRequestClockOut(log.clockOut ? formatForDateTimeLocal(log.clockOut) : "");
    setRequestBreakMins(String(log.breakMins ?? 0));
    setRequestNote(log.note ?? "");
  };

  const submitCorrectionRequest = () => {
    if (!requestClockIn || !requestReason.trim()) {
      show("Bitte Einstempelzeit und Begründung angeben.", "error");
      return;
    }
    startTransition(async () => {
      try {
        await createWorkLogCorrectionRequest({
          workLogId: requestMode === "existing" ? requestLogId || undefined : undefined,
          requestedClockIn: new Date(requestClockIn).toISOString(),
          requestedClockOut: requestClockOut ? new Date(requestClockOut).toISOString() : null,
          requestedBreakMins: Number.parseInt(requestBreakMins || "0", 10),
          requestedNote: requestNote || null,
          reason: requestReason.trim(),
        });
        show("Korrekturantrag gesendet.", "success");
        setRequestMode("existing");
        setRequestLogId("");
        setRequestClockIn("");
        setRequestClockOut("");
        setRequestBreakMins("0");
        setRequestReason("");
        setRequestNote("");
      } catch (err: unknown) {
        show(err instanceof Error ? err.message : "Die Aktion konnte nicht abgeschlossen werden. Bitte erneut versuchen.", "error");
      }
    });
  };

  const decideCorrectionRequest = (
    requestId: string,
    decision: "APPROVE" | "REJECT"
  ) => {
    const reviewerNote = window.prompt(
      decision === "APPROVE" ? "Kommentar zur Freigabe (optional)" : "Grund der Ablehnung (optional)"
    );
    if (reviewerNote === null) return;
    startTransition(async () => {
      try {
        await decideWorkLogCorrectionRequest({ requestId, decision, reviewerNote });
        show(decision === "APPROVE" ? "Antrag freigegeben und gebucht." : "Antrag abgelehnt.", "success");
      } catch (err: unknown) {
        show(err instanceof Error ? err.message : "Die Aktion konnte nicht abgeschlossen werden. Bitte erneut versuchen.", "error");
      }
    });
  };

  const runAIAnalysis = async () => {
    if (isAIAnalyzing) return;
    setIsAIAnalyzing(true);
    try {
      const finishedLogs = logs.filter((log) => log.clockOut);
      const avgBreakMins =
        finishedLogs.length === 0
          ? 0
          : finishedLogs.reduce((sum, log) => sum + Math.max(0, log.breakMins), 0) / finishedLogs.length;
      const correctionNeeds = logs.filter(
        (log) => log.status === "MANUAL_ADJUSTED" || (log.note?.includes("MANAGER_EDIT") ?? false)
      ).length;
      const analysis = buildReportAnalysisFromFacts({
        month,
        totalMinutes,
        totalEntries: logs.length,
        avgBreakMins,
        correctionNeeds,
      });
      setAIAnalysis(analysis);
      show("Datenbasierte System-Analyse erfolgreich erstellt.", "success");
    } catch (err: unknown) {
      show(err instanceof Error ? err.message : "Die System-Analyse konnte nicht erstellt werden. Bitte erneut versuchen.", "error");
    } finally {
      setIsAIAnalyzing(false);
    }
  };

  return (
    <>
      <div
        className={`fixed top-16 left-0 right-0 z-40 h-0.5 bg-primary/70 origin-left transition-transform duration-300 ${
          isRoutePending ? "scale-x-100" : "scale-x-0"
        }`}
      />
      <div className="mx-auto max-w-6xl space-y-5 px-1 sm:space-y-6 sm:px-0">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Berichte</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {month} · {logs.length} Einträge
            </p>
          </div>

          {/* Action buttons */}
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:flex md:w-auto md:flex-wrap md:justify-end md:gap-2">
            <select
              value={monthKey}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("month", e.target.value);
                startRouteTransition(() => {
                  router.push(`${pathname}?${params.toString()}`);
                });
              }}
              className="min-h-12 w-full touch-manipulation rounded-2xl border border-border bg-white px-3 py-2.5 text-base text-foreground sm:text-sm md:min-h-0 md:w-auto md:py-2"
            >
              {monthOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={runAIAnalysis}
              disabled={isAIAnalyzing}
              className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-all active:scale-[0.99] sm:py-2.5 md:min-h-0 md:w-auto ${
                isAIAnalyzing
                  ? "animate-pulse border-violet-200 bg-violet-50/80 text-violet-700 shadow-[0_0_24px_rgba(139,92,246,0.22)]"
                  : "border-violet-200 bg-white text-violet-700 md:hover:bg-violet-50"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isAIAnalyzing ? "System analysiert..." : "System-Analyse"}
            </button>
            <button
              type="button"
              onClick={hasBusinessAccess ? exportPdf : lockedMsg}
              className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all active:scale-[0.99] sm:py-2.5 md:min-h-0 md:w-auto ${
                hasBusinessAccess
                  ? "bg-primary text-foreground ring-1 ring-inset ring-white/20 hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                  : "border border-border bg-card text-muted-foreground md:hover:bg-muted/50"
              }`}
            >
              {hasBusinessAccess ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              PDF exportieren
            </button>
            <PlanGateButton
              icon={Mail}
              label="An Lohnbüro senden"
              plan={plan}
              requiredPlan="BUSINESS"
              onLockedClick={lockedMsg}
              onClick={sendToPayroll}
            />
            <PlanGateButton
              icon={FileSpreadsheet}
              label="CSV exportieren"
              plan={plan}
              requiredPlan="BUSINESS"
              onLockedClick={lockedMsg}
              onClick={exportCsv}
            />
            <button
              type="button"
              onClick={hasBusinessAccess ? () => setShowDatevModal(true) : lockedMsg}
              className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition-all active:scale-[0.99] sm:py-2.5 md:min-h-0 md:w-auto ${
                hasBusinessAccess
                  ? "border-border bg-white text-foreground md:hover:bg-muted/50"
                  : "cursor-pointer border border-border bg-card text-muted-foreground md:hover:bg-muted/50"
              }`}
            >
              {hasBusinessAccess ? (
                <FileText className="w-3.5 h-3.5" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              DATEV-Lohnexport (CSV)
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:[grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {[
            { label: "Gesamtstunden", value: `${totalHoursDecimal} h`, tone: "text-foreground", note: "Zusammenfassung der monatlichen Arbeitszeiten" },
            { label: "Personalkosten (indikativ)", value: `${new Intl.NumberFormat("de-DE").format(Math.round(indicativeCosts))} €`, tone: "text-foreground", note: "Kalkulationsbasis: 29 €/h" },
            { label: "Ø Stunden pro Arbeitstag", value: `${avgHoursPerDay} h`, tone: "text-muted-foreground", note: `${productiveDays} Arbeitstage erfasst` },
            { label: "Zeiteinträge", value: String(logs.length), tone: "text-muted-foreground", note: "Anzahl erfasster Buchungen im Monat" },
          ].map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="animate-in fade-in slide-in-from-bottom-4 rounded-2xl border border-border bg-card p-5 shadow-[0_20px_50px_rgba(0,0,0,0.04)] duration-500 sm:p-6"
            >
              <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-2">{s.label}</p>
              <p className={`text-4xl font-extrabold tracking-tight tabular-nums ${s.tone}`}>{s.value}</p>
              <p className="mt-2 text-xs text-muted-foreground">{s.note}</p>
            </motion.div>
          ))}
        </div>

        {(isAIAnalyzing || aiAnalysis) && (
          <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">VREMA AI</p>
                <h3 className="text-sm font-semibold">Datenbasierte System-Analyse</h3>
              </div>
            </div>

            {isAIAnalyzing ? (
              <div className="space-y-2">
                <div className="h-4 rounded-full bg-violet-100/80 animate-pulse" />
                <div className="h-4 rounded-full bg-violet-100/80 animate-pulse w-11/12" />
                <div className="h-4 rounded-full bg-violet-100/80 animate-pulse w-9/12" />
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-3">
                <p className="text-sm text-foreground leading-relaxed">{aiAnalysis.summary}</p>
                <ul className="space-y-2">
                  {aiAnalysis.highlights.map((item) => (
                    <li key={item} className="text-sm text-muted-foreground leading-relaxed">
                      ✨ {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}

        {isManager && (
          <div className="rounded-2xl border border-border bg-white px-4 py-3 text-xs text-foreground shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
            Status-Legende: <span className="text-emerald-700">Pünktlich</span> ·{" "}
            <span className="text-amber-700">Zu spät (&gt;15 Min nach Schichtbeginn)</span> ·{" "}
            <span className="text-red-700">Fehlend (automatisch per Cron)</span> ·{" "}
            <span className="text-sky-700">Manuell angepasst</span>
          </div>
        )}

        <div className="rounded-2xl bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-4 md:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-wide">Zeitkorrektur-Anträge</h2>
            <span className="text-[11px] text-muted-foreground">
              {correctionRequests.filter((r) => r.status === "PENDING").length} offen
            </span>
          </div>

          {!isManager && (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="sm:col-span-2 rounded-2xl border border-border bg-white px-4 py-3">
                <p className="text-[11px] text-muted-foreground mb-2">Schritt 1: Korrekturmodus wählen</p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="requestMode"
                      checked={requestMode === "existing"}
                      onChange={() => setRequestMode("existing")}
                    />
                    Bestehenden Eintrag ändern
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="requestMode"
                      checked={requestMode === "new"}
                      onChange={() => {
                        setRequestMode("new");
                        setRequestLogId("");
                        setRequestClockIn("");
                        setRequestClockOut("");
                        setRequestBreakMins("0");
                        setRequestNote("");
                      }}
                    />
                    Fehlenden Eintrag nachtragen
                  </label>
                </div>
              </div>
              {requestMode === "existing" && (
                <select
                  value={requestLogId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setRequestLogId(id);
                    const selected = logs.find((l) => l.id === id);
                    if (selected) prefillFromLog(selected);
                  }}
                  className="sm:col-span-2 rounded-2xl border border-border bg-white px-4 py-2 text-sm"
                >
                  <option value="">Bitte Eintrag wählen…</option>
                  {logs.slice(0, 25).map((log) => (
                    <option key={log.id} value={log.id}>
                      {new Date(log.clockIn).toLocaleDateString("de-DE")} {new Date(log.clockIn).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                    </option>
                  ))}
                </select>
              )}
              <label className="text-[11px] text-muted-foreground">{requestMode === "existing" ? "Schritt 2: Neue Einstempelzeit" : "Schritt 2: Einstempelzeit"}</label>
              <label className="text-[11px] text-muted-foreground">{requestMode === "existing" ? "Neue Ausstempelzeit (optional)" : "Ausstempelzeit (optional)"}</label>
              <input
                type="datetime-local"
                value={requestClockIn}
                onChange={(e) => setRequestClockIn(e.target.value)}
                placeholder="Einstempelzeit"
                className="rounded-2xl border border-border bg-white px-4 py-2 text-sm"
              />
              <input
                type="datetime-local"
                value={requestClockOut}
                onChange={(e) => setRequestClockOut(e.target.value)}
                placeholder="Ausstempelzeit (optional)"
                className="rounded-2xl border border-border bg-white px-4 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                max={480}
                value={requestBreakMins}
                onChange={(e) => setRequestBreakMins(e.target.value)}
                placeholder="Pause in Minuten (z.B. 30)"
                className="rounded-2xl border border-border bg-white px-4 py-2 text-sm"
              />
              <input
                type="text"
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="Schritt 3: Begründung (Pflicht)"
                className="rounded-2xl border border-border bg-white px-4 py-2 text-sm sm:col-span-2"
              />
              <input
                type="text"
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="Notiz (optional)"
                className="rounded-2xl border border-border bg-white px-4 py-2 text-sm sm:col-span-2"
              />
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={submitCorrectionRequest}
                  disabled={isSaving}
                  className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-foreground md:hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-60"
                >
                  Antrag senden
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {correctionRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">Noch keine Korrekturanträge in diesem Bereich.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Korrekturen können Sie oben im Formular einreichen, sobald eine Buchung angepasst werden muss.
                </p>
              </div>
            ) : (
              correctionRequests.map((req) => (
                <div key={req.id} className="rounded-2xl border border-border bg-card p-4 text-xs shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{req.userName}</span>
                    <span className="text-muted-foreground">{new Date(req.requestedClockIn).toLocaleString("de-DE")}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        req.status === "PENDING"
                          ? "bg-amber-50 text-amber-700"
                          : req.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <p className="mt-1 text-foreground">Grund: {req.reason}</p>
                  {req.requestedNote && <p className="mt-1 text-muted-foreground">Notiz: {req.requestedNote}</p>}
                  {req.status !== "PENDING" && req.reviewerName && (
                    <p className="mt-1 text-muted-foreground">Bearbeitet von: {req.reviewerName}</p>
                  )}
                  {isManager && req.status === "PENDING" && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => decideCorrectionRequest(req.id, "APPROVE")}
                        className="rounded-xl border border-emerald-200 px-2.5 py-1 text-[11px] text-emerald-700 md:hover:bg-emerald-50 transition-all active:scale-95"
                        disabled={isSaving}
                      >
                        Freigeben & buchen
                      </button>
                      <button
                        type="button"
                        onClick={() => decideCorrectionRequest(req.id, "REJECT")}
                        className="rounded-xl border border-red-200 px-2.5 py-1 text-[11px] text-red-700 md:hover:bg-red-50 transition-all active:scale-95"
                        disabled={isSaving}
                      >
                        Ablehnen
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="px-4 md:px-5 py-3 bg-card/80 flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-xl font-bold tracking-wide">Work-Logs – {month}</span>
          </div>

          {logs.length === 0 ? (
            <div className="py-16 text-center">
              <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Für den gewählten Zeitraum wurden noch keine Arbeitszeiten erfasst.</p>
              <a
                href="/dashboard#terminal-widget"
                className="mt-4 inline-flex min-h-[44px] items-center rounded-2xl border border-border px-4 py-2 text-sm text-foreground transition-all active:scale-95 md:hover:bg-card/70"
              >
                Erste Zeit erfassen
              </a>
            </div>
          ) : (
            <>
              <div className="space-y-3 p-3 sm:hidden">
                {logs.map((log, i) => {
                  const dur = durationMins(log);
                  const clockInDate = new Date(log.clockIn);
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="rounded-2xl border border-border bg-card/90 p-4 text-sm shadow-[0_12px_30px_rgba(0,0,0,0.06)]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/70 pb-3">
                        <div className="min-w-0 flex-1">
                          {isManager && (
                            <p className="text-base font-semibold text-foreground">{log.userName}</p>
                          )}
                          <p className="text-xs text-muted-foreground tabular-nums">{formatDateCsv(clockInDate)}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            log.status === "ABSENT"
                              ? "bg-red-50 text-red-700"
                              : log.status === "LATE"
                                ? "bg-amber-50 text-amber-700"
                                : log.status === "MANUAL_ADJUSTED"
                                  ? "bg-sky-50 text-sky-700"
                                  : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {statusLabel(log.status)}
                        </span>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                        <div>
                          <dt className="text-muted-foreground">Einstempelung</dt>
                          <dd className="font-mono text-foreground">
                            {clockInDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Ausstempelung</dt>
                          <dd className="font-mono text-foreground">
                            {log.clockOut ? (
                              new Date(log.clockOut).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
                            ) : (
                              <span className="text-amber-700">offen</span>
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Pause (Min)</dt>
                          <dd className="tabular-nums text-foreground">{log.breakMins > 0 ? log.breakMins : "–"}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Netto / Std.</dt>
                          <dd className="tabular-nums text-foreground">
                            {dur !== null ? `${Math.round(dur)} min · ${decimalHoursDE(Math.round(dur))} h` : "–"}
                          </dd>
                        </div>
                      </dl>
                      <p className="mt-3 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">Bemerkung: </span>
                        {log.note ?? "–"}
                      </p>
                      {isManager && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(log)}
                            disabled={isSaving}
                            className="min-h-11 flex-1 rounded-xl border border-border px-3 py-2.5 text-xs font-medium text-foreground transition-all active:scale-[0.99] disabled:opacity-50 sm:flex-none md:hover:bg-card/70"
                          >
                            Bearbeiten
                          </button>
                          {log.status === "ABSENT" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAbsentOverride(log)}
                                disabled={isSaving}
                                className="min-h-11 flex-1 rounded-xl border border-amber-200 px-3 py-2.5 text-xs font-medium text-amber-800 transition-all active:scale-[0.99] disabled:opacity-50 sm:flex-none md:hover:bg-amber-50"
                              >
                                Korrigieren
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(log)}
                                disabled={isSaving}
                                className="min-h-11 flex-1 rounded-xl border border-red-200 px-3 py-2.5 text-xs font-medium text-red-700 transition-all active:scale-[0.99] disabled:opacity-50 sm:flex-none md:hover:bg-red-50"
                              >
                                Löschen
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
              <div className="hidden max-h-[72vh] overflow-auto overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="sticky top-0 z-20 border-b border-border bg-card">
                      {[
                        isManager ? "Mitarbeiter" : null,
                        "Datum",
                        "Einstempelzeit",
                        "Ausstempelzeit",
                        "Pause (Min)",
                        "Netto (Min)",
                        "Stunden (Dez.)",
                        "Status",
                        "Bemerkung",
                        isManager ? "Aktion" : null,
                      ]
                        .filter(Boolean)
                        .map((h) => (
                          <th key={h!} className="px-5 py-3 text-left text-[10px] text-muted-foreground uppercase tracking-widest">
                            {h}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, i) => {
                      const dur = durationMins(log);
                      const clockInDate = new Date(log.clockIn);
                      return (
                        <motion.tr
                          key={log.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.025 }}
                          className="even:bg-muted/40/50 hover:bg-muted/50 transition-colors"
                        >
                          {isManager && (
                            <td className="px-5 py-4">
                              <span className="font-medium text-foreground">{log.userName}</span>
                            </td>
                          )}
                          <td className="px-5 py-4 tabular-nums text-xs text-muted-foreground">
                            {formatDateCsv(clockInDate)}
                          </td>
                          <td className="px-5 py-4 tabular-nums text-foreground">
                            {clockInDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-5 py-4 tabular-nums text-foreground">
                            {log.clockOut
                              ? new Date(log.clockOut).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
                              : <span className="animate-pulse text-amber-700">offen</span>}
                          </td>
                          <td className="px-5 py-4 tabular-nums text-xs text-muted-foreground">
                            {log.breakMins > 0 ? log.breakMins : "–"}
                          </td>
                          <td className="px-5 py-4 tabular-nums text-xs font-medium text-foreground">
                            {dur !== null ? Math.round(dur) : "–"}
                          </td>
                          <td className="px-5 py-4 tabular-nums text-xs text-foreground">
                            {dur !== null ? decimalHoursDE(Math.round(dur)) : "–"}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                log.status === "ABSENT"
                                  ? "bg-red-50 text-red-700"
                                  : log.status === "LATE"
                                    ? "bg-amber-50 text-amber-700"
                                    : log.status === "MANUAL_ADJUSTED"
                                      ? "bg-sky-50 text-sky-700"
                                      : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {statusLabel(log.status)}
                            </span>
                          </td>
                          <td className="max-w-[120px] truncate px-5 py-4 text-xs text-muted-foreground">
                            {log.note ?? "–"}
                          </td>
                          {isManager && (
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEdit(log)}
                                  disabled={isSaving}
                                  className="rounded-xl border border-border px-2.5 py-1 text-[11px] text-foreground transition-all active:scale-95 disabled:opacity-50 md:hover:bg-card/70"
                                >
                                  Bearbeiten
                                </button>
                                {log.status === "ABSENT" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleAbsentOverride(log)}
                                      disabled={isSaving}
                                      className="rounded-xl border border-amber-200 px-2.5 py-1 text-[11px] text-amber-700 transition-all active:scale-95 disabled:opacity-50 md:hover:bg-amber-50"
                                    >
                                      Korrigieren
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(log)}
                                      disabled={isSaving}
                                      className="rounded-xl border border-red-200 px-2.5 py-1 text-[11px] text-red-700 transition-all active:scale-95 disabled:opacity-50 md:hover:bg-red-50"
                                    >
                                      Löschen
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Upgrade hint for locked features */}
        {plan === "STARTER" && (
          <div className="rounded-2xl bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm">PDF-Export & Lohnbüro-Versand freischalten</p>
              <p className="text-xs text-muted-foreground mt-1">
                Upgrade auf Business für erweiterte Export- und Versandfunktionen.
              </p>
            </div>
            <a
              href="/dashboard/billing"
              className="shrink-0 px-4 py-2 rounded-2xl bg-primary text-foreground text-sm font-bold md:hover:bg-primary/90 transition-all active:scale-95"
            >
              Upgrade
            </a>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} remove={remove} />
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
            <h3 className="text-base font-semibold">Zeiteintrag bearbeiten</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Für Nachvollziehbarkeit wird die Änderung automatisch als Manager-Edit protokolliert.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <input
                type="datetime-local"
                value={editClockIn}
                onChange={(e) => setEditClockIn(e.target.value)}
                className="rounded-2xl border border-border bg-white px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
              />
              <input
                type="datetime-local"
                value={editClockOut}
                onChange={(e) => setEditClockOut(e.target.value)}
                className="rounded-2xl border border-border bg-white px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
              />
              <input
                type="number"
                min={0}
                max={480}
                value={editBreakMins}
                onChange={(e) => setEditBreakMins(e.target.value)}
                placeholder="Pause in Minuten"
                className="rounded-2xl border border-border bg-white px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
              />
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as LogRow["status"])}
                className="rounded-2xl border border-border bg-white px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
              >
                <option value="ON_TIME">Pünktlich</option>
                <option value="LATE">Zu spät</option>
                <option value="ABSENT">Fehlend</option>
                <option value="MANUAL_ADJUSTED">Manuell angepasst</option>
              </select>
              <input
                type="text"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Grund der Änderung (Pflicht)"
                className="sm:col-span-2 rounded-2xl border border-border bg-white px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
              />
              <input
                type="text"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Notiz (optional)"
                className="sm:col-span-2 rounded-2xl border border-border bg-white px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingLog(null)}
                className="rounded-xl border border-border px-3 py-2 text-xs text-foreground md:hover:bg-card/70 transition-all active:scale-95"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={submitEdit}
                disabled={isSaving}
                className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-foreground md:hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-60"
              >
                {isSaving ? "Speichere..." : "Änderung speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showPayrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
            <h3 className="text-base font-semibold">An Lohnbüro senden</h3>
            <p className="mt-1 text-xs text-muted-foreground">Der aktuelle PDF-Report wird als Anhang per E-Mail versendet.</p>
            <label className="mt-4 block text-xs text-muted-foreground">E-Mail Lohnbüro (mehrere mit ; trennen)</label>
            <input
              type="text"
              value={payrollEmail}
              onChange={(e) => setPayrollEmail(e.target.value)}
              placeholder="lohnbuero@beispiel.de; chef@beispiel.de"
              className="mt-1 w-full rounded-2xl border border-border bg-white px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPayrollModal(false)}
                className="rounded-xl border border-border px-3 py-2 text-xs text-foreground md:hover:bg-card/70 transition-all active:scale-95"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={confirmSendToPayroll}
                disabled={isSaving}
                className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-foreground md:hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-60"
              >
                {isSaving ? "Sende..." : "PDF senden"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Dialog.Root open={showDatevModal} onOpenChange={setShowDatevModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-white/70 px-4" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
            <Dialog.Title className="text-base font-semibold">DATEV Lohn-Export</Dialog.Title>
            <p className="mt-1 text-xs text-muted-foreground">
              CSV mit Berater-/Mandantenbezug und Abrechnungsmonat; Spalten für Lohnarten 001/002, Datum TT.MM.JJJJ und
              Dezimalstunden im deutschen Format (Komma). Ohne Standortdaten, ohne interne Status-Codes.
            </p>

            <label className="mt-4 block text-xs text-muted-foreground">Beraternummer</label>
            <input
              type="text"
              value={beraterNummer}
              onChange={(e) => setBeraterNummer(e.target.value)}
              placeholder="z.B. 12345"
              className="mt-1 w-full rounded-2xl border border-border bg-white px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
            />

            <label className="mt-4 block text-xs text-muted-foreground">Mandantennummer</label>
            <input
              type="text"
              value={mandantenNummer}
              onChange={(e) => setMandantenNummer(e.target.value)}
              placeholder="z.B. 67890"
              className="mt-1 w-full rounded-2xl border border-border bg-white px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
            />

            <label className="mt-4 block text-xs text-muted-foreground">Abrechnungsmonat</label>
            <input
              type="text"
              value={abrechnungsMonat}
              onChange={(e) => setAbrechnungsMonat(e.target.value)}
              placeholder="04/2026"
              className="mt-1 w-full rounded-2xl border border-border bg-white px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDatevModal(false)}
                className="rounded-xl border border-border px-3 py-2 text-xs text-foreground md:hover:bg-card/70 transition-all active:scale-95"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={confirmDatevExport}
                disabled={isDatevDownloading}
                className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-foreground md:hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-60"
              >
                {isDatevDownloading ? "Generiere..." : "Jetzt generieren & herunterladen"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
