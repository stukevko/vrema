"use client";
import { userErrorMessage } from "@/lib/errors/user-message";

import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Mail,
  Clock,
  Lock,
  Download,
  FileSpreadsheet,
  Sparkles,
  Loader2,
  CheckCircle2,
  Check,
  X,
  Printer,
} from "lucide-react";
import { VremaMarkLogo } from "@/components/brand/VremaMarkLogo";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { useMemo, useRef, useState, useTransition } from "react";
import { useHashHighlight } from "@/components/dashboard/useHashHighlight";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createWorkLogCorrectionRequest,
  decideWorkLogCorrectionRequest,
  deleteWorkLogByManager,
  updateWorkLogByManager,
} from "@/lib/actions/worklogs";
import { sendPayrollReportEmail } from "@/lib/actions/emails";
import { exportDatevCsvAction } from "@/lib/actions/reports";
import { confirmTimesheetMonth } from "@/lib/actions/timesheet";
import {
  BUSINESS_UPGRADE_PATH,
  businessUpgradeToast,
  type GatedBusinessFeature,
} from "@/lib/plan-upgrade-messages";
import { minutesToDecimalHours, workedMinutes } from "@/lib/time/payroll";
import type { AIReportAnalysisPayload } from "@/lib/ai/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type CorrectionRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
const DISPLAY_TIME_ZONE = "Europe/Berlin";

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
  canDatevExport: boolean;
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
    originalClockIn: string | null;
    originalClockOut: string | null;
    originalBreakMins: number | null;
    requestedClockIn: string;
    requestedClockOut: string | null;
    requestedBreakMins: number;
    requestedNote: string | null;
    reason: string;
    status: CorrectionRequestStatus;
    reviewerName: string | null;
    reviewerNote: string | null;
  }>;
  currentUserId: string;
  hourlyWageByUserId: Record<string, number | null>;
  timesheetAcknowledgedAtByUserId: Record<string, string>;
}

function formatMins(mins: number) {
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.floor(Math.abs(mins) % 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function berlinDateKey(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { timeZone: DISPLAY_TIME_ZONE });
}

/** Lesbare Zeitspanne für Korrektur-Diff (Europe/Berlin). */
function formatCorrectionSlot(isoIn: string, isoOut: string | null, breakMins: number) {
  const tz = DISPLAY_TIME_ZONE;
  const inD = new Date(isoIn);
  const inTime = inD.toLocaleTimeString("de-DE", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  if (!isoOut) return `${inTime} – offen (keine Ausstempelung)`;
  const outD = new Date(isoOut);
  const outTime = outD.toLocaleTimeString("de-DE", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  if (berlinDateKey(isoIn) === berlinDateKey(isoOut)) return `${inTime} – ${outTime}`;
  const dIn = inD.toLocaleDateString("de-DE", { timeZone: tz, day: "2-digit", month: "2-digit" });
  const dOut = outD.toLocaleDateString("de-DE", { timeZone: tz, day: "2-digit", month: "2-digit" });
  return `${dIn}, ${inTime} → ${dOut}, ${outTime}`;
}

function netWorkedLabel(isoIn: string, isoOut: string | null, breakMins: number): string | null {
  if (!isoOut) return null;
  const net = workedMinutes({ clockIn: isoIn, clockOut: isoOut, breakMins });
  return `${formatMins(net)} netto`;
}

function formatSignedDecimalHoursFromDeltaMins(deltaMins: number): string {
  const sign = deltaMins >= 0 ? "+" : "−";
  const absH = Math.abs(deltaMins) / 60;
  const rounded = Math.round(absH * 10) / 10;
  const s = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(/\.0$/, "");
  return `${sign}${s}h`;
}

function correctionDeltaSummary(params: {
  originalClockIn: string | null;
  originalClockOut: string | null;
  originalBreakMins: number | null;
  requestedClockIn: string;
  requestedClockOut: string | null;
  requestedBreakMins: number;
}): string | null {
  const { originalClockIn, originalClockOut, originalBreakMins, requestedClockIn, requestedClockOut, requestedBreakMins } =
    params;
  if (!requestedClockOut) return null;
  const afterNet = workedMinutes({
    clockIn: requestedClockIn,
    clockOut: requestedClockOut,
    breakMins: requestedBreakMins,
  });
  if (!originalClockIn) {
    const hoursDec = (afterNet / 60).toFixed(1).replace(/\.0$/, "");
    return `Neuer Eintrag · ${hoursDec}h netto (${formatMins(afterNet)})`;
  }
  if (!originalClockOut) {
    return `Vorher offene Buchung – Vergleich Netto nicht möglich · neu ${formatMins(afterNet)} netto`;
  }
  const beforeNet = workedMinutes({
    clockIn: originalClockIn,
    clockOut: originalClockOut,
    breakMins: originalBreakMins ?? 0,
  });
  const delta = afterNet - beforeNet;
  return `Änderung Nettoarbeitszeit: ${formatSignedDecimalHoursFromDeltaMins(delta)} (${formatMins(beforeNet)} → ${formatMins(afterNet)})`;
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
  logs: LogRow[];
}): AIReportAnalysisPayload {
  const totalHours = minutesToDecimalHours(params.totalMinutes, 2);
  const avgBreakLabel = `${Math.round(params.avgBreakMins)} Min`;
  const weekdayLoad = new Map<number, number>();
  let breakRiskCount = 0;
  for (const log of params.logs) {
    const inAt = new Date(log.clockIn);
    const weekday = inAt.getDay();
    const dur = durationMins(log) ?? 0;
    weekdayLoad.set(weekday, (weekdayLoad.get(weekday) ?? 0) + Math.max(0, dur));
    if (dur >= 360 && log.breakMins < 30) breakRiskCount += 1;
  }
  const peakDay = Array.from(weekdayLoad.entries()).sort((a, b) => b[1] - a[1])[0];
  const dayLabel = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"][
    peakDay?.[0] ?? 1
  ];
  const tips = [
    `Kapazitäts-Tipp: Höchste Auslastung am ${dayLabel} erkannt${peakDay ? ` (${minutesToDecimalHours(peakDay[1], 1)}h)` : ""}. Prüfen Sie dort die Schichtverteilung.`,
    breakRiskCount > 0
      ? `Compliance-Tipp: ${breakRiskCount} Schichten mit möglichem Pausenverstoß erkannt. Planen Sie für diese Teams feste Pausenfenster ein.`
      : "Compliance-Tipp: Keine kritischen Pausenverstöße erkannt. Halten Sie die aktuelle Pausenstruktur stabil.",
    params.correctionNeeds > 0
      ? `Prozess-Tipp: ${params.correctionNeeds} Korrekturbedarfe im Zeitraum. Zielwert < 3 durch klarere Schicht-Startregeln.`
      : "Prozess-Tipp: Sehr saubere Datenlage ohne Korrekturbedarf. Nutzen Sie das als Standard für alle Abteilungen.",
  ];

  return {
    generatedAt: new Date().toISOString(),
    summary:
      `Für ${params.month} wurden ${totalHours} Stunden in ${params.totalEntries} Einträgen dokumentiert. ` +
      `Die durchschnittliche Pausendauer liegt bei ${avgBreakLabel}, mit ${params.correctionNeeds} Korrekturbedarfen im Zeitraum.`,
    highlights: [
      `Gesamtstunden: ${totalHours} h`,
      `Durchschnittliche Pausendauer: ${avgBreakLabel}`,
      `Korrekturbedarfe im Zeitraum: ${params.correctionNeeds}`,
      ...tips,
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
  return value.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
  });
}

/** Striktes TT.MM.JJJJ für Lohn-/DATEV-Exporte (unabhängig von Browser-Locale-Details). */
function formatDateCsv(value: Date) {
  const d = value.getDate().toString().padStart(2, "0");
  const m = (value.getMonth() + 1).toString().padStart(2, "0");
  const y = value.getFullYear();
  return `${d}.${m}.${y}`;
}

function formatTimeCsv(value: Date) {
  return value.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: DISPLAY_TIME_ZONE,
  });
}

function employeeNumberOrFallback(log: LogRow) {
  if (log.employeeNumber && log.employeeNumber.trim()) return log.employeeNumber.trim();
  return `MA-${log.userId.slice(-6).toUpperCase()}`;
}

function formatForDateTimeLocal(iso: string) {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const map: Record<string, string> = {};
  for (const part of parts) if (part.type !== "literal") map[part.type] = part.value;
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
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

/** Schwarz-Weiß-taugliche Status für Druck & PDF (Symbol statt Farbe). */
function statusPrintLabel(status: LogRow["status"]) {
  const label = statusLabel(status);
  if (status === "LATE") return `▲ ${label}`;
  if (status === "ABSENT") return `■ ${label}`;
  if (status === "MANUAL_ADJUSTED") return `◆ ${label}`;
  return `● ${label}`;
}

function statusPrintClass(status: LogRow["status"]) {
  if (status === "LATE" || status === "ABSENT") return "print-status--emphasis";
  if (status === "MANUAL_ADJUSTED") return "print-status--emphasis print-status--manual";
  if (status === "ON_TIME") return "print-status--ok";
  return "print-status--ok";
}

function logEntryStatusTone(status: LogRow["status"]): "success" | "warning" | "danger" | "brand" {
  if (status === "ABSENT") return "danger";
  if (status === "LATE") return "warning";
  if (status === "MANUAL_ADJUSTED") return "brand";
  return "success";
}

function correctionRequestStatusTone(status: CorrectionRequestStatus): "warning" | "success" | "danger" {
  if (status === "PENDING") return "warning";
  if (status === "APPROVED") return "success";
  return "danger";
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
          : "border-border bg-surface text-foreground md:hover:bg-muted/50"
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
  canDatevExport,
  companyName,
  monthlySollMinutesByUser,
  absences,
  correctionRequests,
  currentUserId,
  hourlyWageByUserId,
  timesheetAcknowledgedAtByUserId,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toasts, show, remove } = useToast();
  const [isSaving, startTransition] = useTransition();
  const [isRoutePending, startRouteTransition] = useTransition();
  const [isAckPending, startAckTransition] = useTransition();
  const [showPayrollModal, setShowPayrollModal] = useState(false);
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

  const correctionSectionRef = useRef<HTMLDivElement | null>(null);
  const highlightCorrections = useHashHighlight("zeitkorrekturen", correctionSectionRef);

  const [correctionDecision, setCorrectionDecision] = useState<{
    id: string;
    mode: "APPROVE" | "REJECT";
    note: string;
  } | null>(null);
  const [correctionDecisionError, setCorrectionDecisionError] = useState<string | null>(null);

  const showBusinessUpgrade = (feature: GatedBusinessFeature) => {
    show(businessUpgradeToast(feature), "info");
    router.push(BUSINESS_UPGRADE_PATH);
  };

  const [isDatevDownloading, setIsDatevDownloading] = useState(false);
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
  const [aiAnalysis, setAIAnalysis] = useState<AIReportAnalysisPayload | null>(null);
  const hasBusinessAccess = plan === "BUSINESS" || plan === "ENTERPRISE";
  const totalHoursDecimal = minutesToDecimalHours(totalMinutes, 2);
  const productiveDays = new Set(
    logs.map((log) =>
      new Date(log.clockIn).toLocaleDateString("de-DE", {
        timeZone: DISPLAY_TIME_ZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    )
  ).size;
  const avgHoursPerDay = productiveDays > 0 ? minutesToDecimalHours(totalMinutes / productiveDays, 2) : "0.00";
  const payrollGrossEuro = useMemo(() => {
    let t = 0;
    for (const log of logs) {
      const w = hourlyWageByUserId[log.userId];
      if (w == null || w <= 0) continue;
      const d = durationMins(log);
      if (d == null || d <= 0) continue;
      t += (d / 60) * w;
    }
    return t;
  }, [logs, hourlyWageByUserId]);
  const hasWageData = payrollGrossEuro > 0;
  const indicativeCostsFallback = Number.parseFloat(totalHoursDecimal) * 29;
  const costSummaryLabel = hasWageData ? "Brutto-Lohn (geschätzt)" : "Personalkosten (indikativ)";
  const costSummaryValue = hasWageData
    ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Math.round(payrollGrossEuro))
    : `${new Intl.NumberFormat("de-DE").format(Math.round(indicativeCostsFallback))} €`;
  const costSummaryNote = hasWageData
    ? "Ist-Stunden × hinterlegter Stundenlohn (Brutto, ohne Zuschläge)"
    : "Kein Stundenlohn im Team hinterlegt – Kalkulation mit 29 €/h";
  const monthOptions = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const d = new Date(base.getFullYear(), base.getMonth() - index, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: DISPLAY_TIME_ZONE });
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
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(10, 20, pageWidth - 10, 20);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("VREMA", 10, 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(pdfHeaderFirmenzeile(companyName), 10, 15);
      doc.text(month, pageWidth - 10, 10, { align: "right" });
      doc.setFontSize(8);
      doc.text(`Erstellt: ${formatDateDE(new Date())}`, pageWidth - 10, 15, { align: "right" });

      const colW = (pageWidth - 20) / 3;
      const summaryY = 24;
      const boxH = 12;
      doc.setDrawColor(226, 232, 240);
      doc.rect(10, summaryY, pageWidth - 20, boxH);
      doc.line(10 + colW, summaryY, 10 + colW, summaryY + boxH);
      doc.line(10 + colW * 2, summaryY, 10 + colW * 2, summaryY + boxH);
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text("MANDANT", 12, summaryY + 4);
      doc.text("ZEITRAUM", 12 + colW, summaryY + 4);
      doc.text("GESAMTSTUNDEN", 12 + colW * 2, summaryY + 4);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(pdfHeaderFirmenzeile(companyName), 12, summaryY + 9.5);
      doc.text(month, 12 + colW, summaryY + 9.5);
      doc.text(`${decimalHoursDE(totalMinutes)} h`, 12 + colW * 2, summaryY + 9.5);
      doc.setFont("helvetica", "normal");
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
      const sectionStartY = 40;
      const headerHeight = 11;
      const nameY = sectionStartY + 4.5;

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.15);
      doc.line(10, sectionStartY, pageWidth - 10, sectionStartY);
      doc.line(10, sectionStartY + headerHeight, pageWidth - 10, sectionStartY + headerHeight);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(
        `${first.userName}${first.employeeNumber ? ` (#${first.employeeNumber})` : ""}`,
        12,
        nameY,
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text(
        `Ist ${decimalHoursDE(userIst)} h · Soll ${decimalHoursDE(userSoll)} h · Diff. ${decimalHoursDE(diff)} h · ${Math.round(ratio * 100)} % Soll`,
        pageWidth - 12,
        nameY,
        { align: "right" },
      );

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
            statusPrintLabel(log.status),
            log.note ?? "",
          ];
        });

      autoTable(doc, {
        startY: sectionStartY + headerHeight + 3,
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
        theme: "plain",
        styles: {
          fontSize: 8,
          cellPadding: 1.4,
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
          textColor: [0, 0, 0],
          fillColor: [255, 255, 255],
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          fontSize: 7,
          lineWidth: 0.15,
          lineColor: [203, 213, 225],
        },
        alternateRowStyles: { fillColor: [255, 255, 255] },
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
          if (raw.includes("▲") || raw.includes("■") || raw.includes("◆")) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.textColor = [0, 0, 0];
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
      const ackIso = timesheetAcknowledgedAtByUserId[first.userId];
      if (ackIso) {
        const ackDate = new Date(ackIso);
        doc.setFontSize(8);
        doc.setTextColor(45, 110, 65);
        doc.text(
          `Digitale Monatsbestätigung Mitarbeiter: ${formatDateDE(ackDate)} ${formatTimeCsv(ackDate)} (${DISPLAY_TIME_ZONE})`,
          11,
          signY + 11
        );
        doc.setTextColor(15, 15, 15);
      }
    });

    const safeMonth = month.replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
    return { doc, fileName: `vrema-report-${safeMonth || "monat"}.pdf` };
  };
  const exportPdf = () => {
    const { doc, fileName } = buildPdfDocAndName();
    doc.save(fileName);
  };

  const printReport = () => {
    window.print();
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
        show(userErrorMessage(err, "Die Aktion konnte nicht abgeschlossen werden. Bitte erneut versuchen."), "error");
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

  const handleDatevExport = async () => {
    if (!canDatevExport || isDatevDownloading) return;
    const inconsistencies = logs.filter((log) => {
      const dur = durationMins(log) ?? 0;
      return dur >= 360 && log.breakMins < 30;
    }).length;
    if (inconsistencies > 0) {
      const proceed = window.confirm(
        `Achtung: Es gibt ${inconsistencies} Unstimmigkeiten in diesem Monat. Trotzdem exportieren?`
      );
      if (!proceed) return;
    }
    setIsDatevDownloading(true);
    show("DATEV-Export wird vorbereitet...", "info");
    try {
      const { csv, fileName, rowsCount } = await exportDatevCsvAction(monthKey);
      const bom = "\uFEFF";
      const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      show(`DATEV-CSV wurde heruntergeladen (${rowsCount} Zeilen).`, "success");
    } catch (err: unknown) {
      show(userErrorMessage(err, "DATEV-Export fehlgeschlagen."), "error");
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
        router.refresh();
      } catch (err: unknown) {
        show(userErrorMessage(err, "Die Aktion konnte nicht abgeschlossen werden. Bitte erneut versuchen."), "error");
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
          note: (log.note ? `${log.note} | ` : "") + "[MANUELLE-KORREKTUR]",
          editReason: reason.trim(),
        });
        show("Fehlender Tag wurde korrigiert.", "success");
        router.refresh();
      } catch (err: unknown) {
        show(userErrorMessage(err, "Die Aktion konnte nicht abgeschlossen werden. Bitte erneut versuchen."), "error");
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
        router.refresh();
      } catch (err: unknown) {
        show(userErrorMessage(err, "Die Aktion konnte nicht abgeschlossen werden. Bitte erneut versuchen."), "error");
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
        router.refresh();
        setRequestMode("existing");
        setRequestLogId("");
        setRequestClockIn("");
        setRequestClockOut("");
        setRequestBreakMins("0");
        setRequestReason("");
        setRequestNote("");
      } catch (err: unknown) {
        show(userErrorMessage(err, "Die Aktion konnte nicht abgeschlossen werden. Bitte erneut versuchen."), "error");
      }
    });
  };

  const submitCorrectionDecision = () => {
    if (!correctionDecision) return;
    setCorrectionDecisionError(null);
    const note = correctionDecision.note.trim();
    if (correctionDecision.mode === "REJECT" && note.length < 3) {
      setCorrectionDecisionError("Bitte eine kurze Begründung angeben (≥ 3 Zeichen) – der Kollege sieht sie im Dashboard.");
      return;
    }
    startTransition(async () => {
      try {
        await decideWorkLogCorrectionRequest({
          requestId: correctionDecision.id,
          decision: correctionDecision.mode,
          reviewerNote: note.length > 0 ? note : null,
        });
        show(
          correctionDecision.mode === "APPROVE"
            ? "Korrektur freigegeben und gebucht."
            : "Korrektur abgelehnt – Begründung gespeichert.",
          "success"
        );
        setCorrectionDecision(null);
        router.refresh();
      } catch (err: unknown) {
        show(userErrorMessage(err, "Die Aktion konnte nicht abgeschlossen werden."), "error");
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
        (log) =>
          log.status === "MANUAL_ADJUSTED" ||
          (log.note?.includes("MANAGER-BEARBEITUNG") ?? false) ||
          (log.note?.includes("MANAGER_EDIT") ?? false)
      ).length;
      const analysis = buildReportAnalysisFromFacts({
        month,
        totalMinutes,
        totalEntries: logs.length,
        avgBreakMins,
        correctionNeeds,
        logs,
      });
      setAIAnalysis(analysis);
      show("Auswertung wurde erstellt.", "success");
    } catch (err: unknown) {
      show("Die Auswertung konnte nicht erstellt werden. Bitte erneut versuchen.", "error");
    } finally {
      setIsAIAnalyzing(false);
    }
  };

  return (
    <>
      <div
        className={`no-print fixed top-16 left-0 right-0 z-40 h-0.5 bg-primary/70 origin-left transition-transform duration-300 ${
          isRoutePending ? "scale-x-100" : "scale-x-0"
        }`}
      />
      <motion.div className="print-root mx-auto max-w-6xl space-y-5 px-1 sm:space-y-6 sm:px-0">
        <header className="print-only print-header">
          <div className="print-header__brand">
            <VremaMarkLogo size={28} className="!text-black dark:!text-black" />
            <span className="text-sm font-bold tracking-tight">VREMA</span>
          </div>
          <div className="print-header__meta">
            <p className="font-semibold">{pdfHeaderFirmenzeile(companyName)}</p>
            <p>{month}</p>
            <p className="mt-0.5 text-[8pt] text-slate-600">
              Erstellt {formatDateDE(new Date())} · {logs.length} Einträge
            </p>
          </div>
        </header>

        <dl className="print-only print-summary-grid">
          <div>
            <dt>Mandant</dt>
            <dd>{pdfHeaderFirmenzeile(companyName)}</dd>
          </div>
          <div>
            <dt>Zeitraum</dt>
            <dd>{month}</dd>
          </div>
          <div>
            <dt>Gesamtstunden</dt>
            <dd>{totalHoursDecimal} h</dd>
          </div>
        </dl>

        {isManager && (
          <div className="print-only print-legend">
            <span className="print-status--ok">Pünktlich</span>
            <span className="print-status--late">Zu spät</span>
            <span className="print-status--absent">Fehlend</span>
            <span className="print-status--manual">Manuell</span>
          </div>
        )}

        {/* Header */}
        <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight sm:text-2xl md:text-3xl">Berichte</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
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
              className="min-h-12 w-full touch-manipulation rounded-2xl border border-border bg-surface px-3 py-2.5 text-base text-foreground sm:text-sm md:min-h-0 md:w-auto md:py-2"
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
                  ? "animate-pulse border-brand/35 bg-brand-soft text-brand shadow-[var(--shadow-card-hover)]"
                  : "border-brand/25 bg-surface text-brand md:hover:bg-brand-soft"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isAIAnalyzing ? "Auswertung läuft …" : "Auswertung starten"}
            </button>
            <button
              type="button"
              onClick={hasBusinessAccess ? exportPdf : () => showBusinessUpgrade("pdf")}
              className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all active:scale-[0.99] sm:py-2.5 md:min-h-0 md:w-auto ${
                hasBusinessAccess
                  ? "bg-primary text-foreground ring-1 ring-inset ring-white/20 hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                  : "border border-border bg-card text-muted-foreground md:hover:bg-muted/50"
              }`}
            >
              {hasBusinessAccess ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              PDF exportieren
            </button>
            <button
              type="button"
              onClick={hasBusinessAccess ? printReport : () => showBusinessUpgrade("print")}
              className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition-all active:scale-[0.99] sm:py-2.5 md:min-h-0 md:w-auto ${
                hasBusinessAccess
                  ? "border-border bg-surface text-foreground md:hover:bg-muted/50"
                  : "border border-border bg-card text-muted-foreground md:hover:bg-muted/50"
              }`}
            >
              {hasBusinessAccess ? <Printer className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              Drucken
            </button>
            <PlanGateButton
              icon={Mail}
              label="An Lohnbüro senden"
              plan={plan}
              requiredPlan="BUSINESS"
              onLockedClick={() => showBusinessUpgrade("payroll")}
              onClick={sendToPayroll}
            />
            <PlanGateButton
              icon={FileSpreadsheet}
              label="CSV exportieren"
              plan={plan}
              requiredPlan="BUSINESS"
              onLockedClick={() => showBusinessUpgrade("csv")}
              onClick={exportCsv}
            />
            <button
              type="button"
              onClick={canDatevExport ? handleDatevExport : () => show("Nur Owner/Admin dürfen DATEV exportieren.", "error")}
              disabled={isDatevDownloading}
              className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition-all active:scale-[0.99] sm:py-2.5 md:min-h-0 md:w-auto ${
                canDatevExport
                  ? "border-border bg-surface text-foreground md:hover:bg-muted/50"
                  : "cursor-pointer border border-border bg-card text-muted-foreground md:hover:bg-muted/50"
              }`}
            >
              {isDatevDownloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : canDatevExport ? (
                <FileText className="h-3.5 w-3.5" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              {isDatevDownloading ? "DATEV wird erstellt..." : "DATEV-Lohnexport (CSV)"}
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="no-print grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:[grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {[
            { label: "Gesamtstunden", value: `${totalHoursDecimal} h`, tone: "text-foreground", note: "Zusammenfassung der monatlichen Arbeitszeiten" },
            { label: costSummaryLabel, value: costSummaryValue, tone: "text-foreground", note: costSummaryNote },
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

        <div className="no-print rounded-2xl border border-brand/20 bg-brand-soft/50 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-6">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <CheckCircle2 className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-fg-muted">Monats-Stundenzettel</p>
                <h3 className="mt-1 text-base font-semibold text-fg">Eigene Stunden bestätigen</h3>
                <p className="mt-2 text-sm text-fg-muted">
                  Einmal pro Monat bestätigen – der Zeitstempel erscheint in deinem Abschnitt im PDF-Export (Nachweis für die Personalakte).
                </p>
                {timesheetAcknowledgedAtByUserId[currentUserId] ? (
                  <p className="mt-4 text-sm font-medium text-success-foreground">
                    Bestätigt am {formatDateDE(new Date(timesheetAcknowledgedAtByUserId[currentUserId]))} um{" "}
                    {formatTimeCsv(new Date(timesheetAcknowledgedAtByUserId[currentUserId]))} ({DISPLAY_TIME_ZONE})
                  </p>
                ) : (
                  <Button
                    type="button"
                    disabled={isAckPending}
                    variant="brand"
                    size="md"
                    className="mt-4"
                    loading={isAckPending}
                    onClick={() => {
                      startAckTransition(async () => {
                        try {
                          await confirmTimesheetMonth(monthKey);
                          show("Stunden für den Monat bestätigt.", "success");
                          router.refresh();
                        } catch (err: unknown) {
                          show(userErrorMessage(err, "Bestätigung fehlgeschlagen."), "error");
                        }
                      });
                    }}
                  >
                    {isAckPending ? "Speichere…" : "Stunden bestätigen"}
                  </Button>
                )}
              </div>
            </div>
          </div>

        {(isAIAnalyzing || aiAnalysis) && (
          <div className="no-print rounded-2xl border border-brand/20 bg-surface p-5 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-widest text-fg-muted">Hinweise</p>
                <h3 className="text-sm font-semibold text-fg">Tipps aus deinen Betriebsdaten</h3>
              </div>
            </div>

            {isAIAnalyzing ? (
              <div className="space-y-2">
                <div className="h-4 animate-pulse rounded-full bg-brand-soft" />
                <div className="h-4 w-11/12 animate-pulse rounded-full bg-brand-soft" />
                <div className="h-4 w-9/12 animate-pulse rounded-full bg-brand-soft" />
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-fg">{aiAnalysis.summary}</p>
                <ul className="space-y-2">
                  {aiAnalysis.highlights.map((item) => (
                    <li key={item} className="text-sm leading-relaxed text-fg-muted">
                      ✨ {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}

        {isManager && (
          <motion.div className="no-print rounded-2xl border border-line bg-surface px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">Status-Legende</p>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="success" size="sm">
                Pünktlich
              </StatusBadge>
              <StatusBadge tone="warning" size="sm">
                Zu spät (&gt;15 Min nach Schichtbeginn)
              </StatusBadge>
              <StatusBadge tone="danger" size="sm">
                Fehlend (automatisch per Cron)
              </StatusBadge>
              <StatusBadge tone="brand" size="sm">
                Manuell angepasst
              </StatusBadge>
            </div>
          </motion.div>
        )}

        <div
          id="zeitkorrekturen"
          ref={correctionSectionRef}
          className={`no-print scroll-mt-24 rounded-2xl bg-card border p-4 md:p-5 space-y-3 transition-all duration-500 ${
            highlightCorrections
              ? "border-brand ring-4 ring-brand/40 shadow-[0_24px_60px_rgba(0,0,0,0.10)]"
              : "border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-wide">Zeitkorrektur-Anträge</h2>
            <span className="text-[11px] text-muted-foreground">
              {correctionRequests.filter((r) => r.status === "PENDING").length} offen
            </span>
          </div>

          {!isManager && (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="sm:col-span-2 rounded-2xl border border-border bg-surface px-4 py-3">
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
                  className="sm:col-span-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm"
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
                className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm"
              />
              <input
                type="datetime-local"
                value={requestClockOut}
                onChange={(e) => setRequestClockOut(e.target.value)}
                placeholder="Ausstempelzeit (optional)"
                className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                max={480}
                value={requestBreakMins}
                onChange={(e) => setRequestBreakMins(e.target.value)}
                placeholder="Pause in Minuten (z.B. 30)"
                className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm"
              />
              <input
                type="text"
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="Schritt 3: Begründung (Pflicht)"
                className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm sm:col-span-2"
              />
              <input
                type="text"
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="Notiz (optional)"
                className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm sm:col-span-2"
              />
              <div className="sm:col-span-2 flex justify-end">
                <Button
                  type="button"
                  variant="brand"
                  size="sm"
                  onClick={submitCorrectionRequest}
                  disabled={isSaving}
                  loading={isSaving}
                >
                  Antrag senden
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {correctionRequests.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="Keine Korrekturanträge"
                description="Stell oben einen Antrag, sobald eine Buchung angepasst werden muss."
              />
            ) : (
              correctionRequests.map((req) => {
                const correctionStatusDisplay =
                  req.status === "PENDING" ? "Ausstehend" : req.status === "APPROVED" ? "Freigegeben" : "Abgelehnt";
                const beforeLabel =
                  req.originalClockIn == null
                    ? req.workLogId
                      ? "Ursprünglicher Eintrag nicht mehr verfügbar"
                      : "Kein bestehender Eintrag (Nachtrag)"
                    : formatCorrectionSlot(req.originalClockIn, req.originalClockOut, req.originalBreakMins ?? 0);
                const afterLabel = formatCorrectionSlot(
                  req.requestedClockIn,
                  req.requestedClockOut,
                  req.requestedBreakMins
                );
                const beforeNet =
                  req.originalClockIn && req.originalClockOut
                    ? netWorkedLabel(req.originalClockIn, req.originalClockOut, req.originalBreakMins ?? 0)
                    : null;
                const afterNet = req.requestedClockOut
                  ? netWorkedLabel(req.requestedClockIn, req.requestedClockOut, req.requestedBreakMins)
                  : null;
                const deltaLine = correctionDeltaSummary({
                  originalClockIn: req.originalClockIn,
                  originalClockOut: req.originalClockOut,
                  originalBreakMins: req.originalBreakMins,
                  requestedClockIn: req.requestedClockIn,
                  requestedClockOut: req.requestedClockOut,
                  requestedBreakMins: req.requestedBreakMins,
                });
                const breakChanged =
                  req.originalBreakMins != null && req.originalBreakMins !== req.requestedBreakMins;

                return (
                  <div
                    key={req.id}
                    className={`rounded-2xl border bg-card p-4 text-xs shadow-[0_20px_50px_rgba(0,0,0,0.04)] ring-1 ring-inset ring-black/[0.03] ${
                      correctionDecision?.id === req.id ? "border-brand ring-2 ring-brand/35" : "border-border"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-3">
                      <span className="text-sm font-semibold text-foreground">{req.userName}</span>
                      <StatusBadge tone={correctionRequestStatusTone(req.status)} size="sm" withDot={false}>
                        {correctionStatusDisplay}
                      </StatusBadge>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
                      <div className="rounded-xl border border-line bg-surface-muted px-3 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">Alte Zeit</p>
                        <p className="mt-1 font-mono text-sm font-semibold text-fg">{beforeLabel}</p>
                        {beforeNet ? (
                          <p className="mt-1 text-[11px] text-fg-muted">
                            Pause {req.originalBreakMins ?? 0} Min · {beforeNet}
                          </p>
                        ) : req.originalClockIn ? (
                          <p className="mt-1 text-[11px] text-fg-muted">Pause {req.originalBreakMins ?? 0} Min</p>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-center md:min-w-[2rem]">
                        <span
                          className="rounded-full bg-brand-soft px-3 py-1 text-lg font-black text-brand md:rotate-0"
                          aria-hidden
                        >
                          →
                        </span>
                      </div>

                      <div className="rounded-xl border border-brand/25 bg-brand-soft px-3 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-brand">Neue Zeit</p>
                        <p className="mt-1 font-mono text-sm font-semibold text-fg">{afterLabel}</p>
                        <p className="mt-1 text-[11px] text-success-foreground">
                          Pause {req.requestedBreakMins} Min
                          {afterNet ? ` · ${afterNet}` : ""}
                        </p>
                      </div>
                    </div>

                    {deltaLine ? (
                      <div className="mt-3 rounded-lg border border-warning/25 bg-warning-soft px-3 py-2 text-[11px] font-semibold text-warning-foreground">
                        {deltaLine}
                      </div>
                    ) : null}

                    {breakChanged && req.originalBreakMins != null ? (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Pausenänderung: {req.originalBreakMins} → {req.requestedBreakMins} Min
                      </p>
                    ) : null}

                    <p className="mt-3 text-sm text-foreground">
                      <span className="font-semibold">Begründung:</span> {req.reason}
                    </p>
                    {req.requestedNote ? (
                      <p className="mt-1 text-muted-foreground">
                        <span className="font-medium text-foreground">Notiz:</span> {req.requestedNote}
                      </p>
                    ) : null}
                    {req.status !== "PENDING" && req.reviewerName ? (
                      <p className="mt-2 text-muted-foreground">Bearbeitet von: {req.reviewerName}</p>
                    ) : null}
                    {req.status !== "PENDING" && req.reviewerNote ? (
                      <p className="mt-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[11px] text-foreground">
                        <span className="font-semibold">Hinweis vom Genehmiger:</span> {req.reviewerNote}
                      </p>
                    ) : null}
                    {isManager && req.status === "PENDING" && correctionDecision?.id !== req.id && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                        <Button
                          type="button"
                          variant="brand"
                          size="sm"
                          onClick={() => {
                            setCorrectionDecisionError(null);
                            setCorrectionDecision({ id: req.id, mode: "APPROVE", note: "" });
                          }}
                          disabled={isSaving}
                        >
                          Freigeben & buchen
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setCorrectionDecisionError(null);
                            setCorrectionDecision({ id: req.id, mode: "REJECT", note: "" });
                          }}
                          disabled={isSaving}
                        >
                          Ablehnen
                        </Button>
                      </div>
                    )}
                    <AnimatePresence>
                      {isManager && req.status === "PENDING" && correctionDecision?.id === req.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div
                            className={`mt-4 rounded-xl border p-4 ${
                              correctionDecision.mode === "APPROVE"
                                ? "border-brand/30 bg-brand-soft"
                                : "border-danger/30 bg-danger-soft"
                            }`}
                          >
                            <p className="text-sm font-semibold text-foreground">
                              {correctionDecision.mode === "APPROVE"
                                ? "Lohnrelevante Buchung freigeben?"
                                : "Korrektur wirklich ablehnen?"}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {correctionDecision.mode === "APPROVE"
                                ? "Optionaler Kommentar wird nur intern gespeichert und hier angezeigt."
                                : "Pflicht: Begründung (≥ 3 Zeichen) – wird hier im Bericht gespeichert und angezeigt."}
                            </p>
                            <textarea
                              value={correctionDecision.note}
                              onChange={(e) =>
                                setCorrectionDecision((d) => (d ? { ...d, note: e.target.value } : d))
                              }
                              placeholder={
                                correctionDecision.mode === "APPROVE"
                                  ? "Optionaler interner Kommentar zur Freigabe"
                                  : "Begründung für die Ablehnung (Pflicht)"
                              }
                              rows={3}
                              className="mt-3 w-full resize-y rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                              autoFocus
                            />
                            {correctionDecisionError ? (
                              <p className="mt-2 text-[11px] font-medium text-danger">{correctionDecisionError}</p>
                            ) : null}
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant={correctionDecision.mode === "APPROVE" ? "brand" : "danger"}
                                size="md"
                                loading={isSaving}
                                onClick={submitCorrectionDecision}
                                leadingIcon={
                                  !isSaving ? (
                                    correctionDecision.mode === "APPROVE" ? (
                                      <Check className="h-4 w-4" />
                                    ) : (
                                      <X className="h-4 w-4" />
                                    )
                                  ) : undefined
                                }
                              >
                                {isSaving
                                  ? "Speichere…"
                                  : correctionDecision.mode === "APPROVE"
                                    ? "Jetzt freigeben & buchen"
                                    : "Ablehnung speichern"}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="md"
                                onClick={() => {
                                  setCorrectionDecision(null);
                                  setCorrectionDecisionError(null);
                                }}
                                disabled={isSaving}
                              >
                                Abbrechen
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden print:overflow-visible print:rounded-none print:border print:border-slate-200 print:shadow-none">
          <div className="no-print px-4 md:px-5 py-3 bg-card/80 flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-xl font-bold tracking-wide">Work-Logs – {month}</span>
          </div>
          <h2 className="print-only print-section-title">Work-Logs – {month}</h2>

          {logs.length === 0 ? (
            <EmptyState
              className="mx-3 mb-4 md:mx-5"
              icon={Clock}
              title="Noch keine Zeiten in diesem Monat"
              description="Sobald im Betrieb gestempelt wird, erscheinen die Einträge hier."
              action={
                <a
                  href="/dashboard#terminal-widget"
                  className="btn-brand inline-flex min-h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold"
                >
                  Zum Stempeln
                </a>
              }
            />
          ) : (
            <>
              <div className="no-print space-y-3 p-3 sm:hidden">
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
                        <StatusBadge tone={logEntryStatusTone(log.status)} size="sm" withDot={false} className="shrink-0">
                          {statusLabel(log.status)}
                        </StatusBadge>
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
                              <span className="text-warning">offen</span>
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
                                className="min-h-11 flex-1 rounded-xl border border-warning/35 bg-warning-soft px-3 py-2.5 text-xs font-medium text-warning-foreground transition-all active:scale-[0.99] disabled:opacity-50 sm:flex-none md:hover:bg-warning-soft/80"
                              >
                                Korrigieren
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(log)}
                                disabled={isSaving}
                                className="min-h-11 flex-1 rounded-xl border border-danger/35 bg-danger-soft px-3 py-2.5 text-xs font-medium text-danger-foreground transition-all active:scale-[0.99] disabled:opacity-50 sm:flex-none md:hover:bg-danger-soft/80"
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
              <div className="print-table-wrap hidden max-h-[72vh] overflow-auto overflow-x-auto scrollbar-hide sm:block print:block print:max-h-none">
                <table className="print-table w-full text-sm">
                  <thead>
                    <tr className="sticky top-0 z-20 border-b border-border bg-card print:static print:bg-white">
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
                          <th
                            key={h!}
                            className={`px-5 py-3 text-left text-[10px] text-muted-foreground uppercase tracking-widest ${h === "Aktion" ? "no-print" : ""}`}
                          >
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
                          className="even:bg-muted/40/50 hover:bg-muted/50 transition-colors print:bg-white print:even:bg-white"
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
                              : <span className="animate-pulse text-warning">offen</span>}
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
                              className={`hidden print:inline text-xs ${statusPrintClass(log.status)} print-status--${log.status === "LATE" ? "late" : log.status === "ABSENT" ? "absent" : log.status === "MANUAL_ADJUSTED" ? "manual" : "ok"}`}
                            >
                              {statusPrintLabel(log.status)}
                            </span>
                            <StatusBadge tone={logEntryStatusTone(log.status)} size="sm" withDot={false} className="print:hidden">
                              {statusLabel(log.status)}
                            </StatusBadge>
                          </td>
                          <td className="max-w-[120px] truncate px-5 py-4 text-xs text-muted-foreground">
                            {log.note ?? "–"}
                          </td>
                          {isManager && (
                            <td className="no-print px-5 py-4">
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
                                      className="rounded-xl border border-warning/35 bg-warning-soft px-2.5 py-1 text-[11px] text-warning-foreground transition-all active:scale-95 disabled:opacity-50 md:hover:bg-warning-soft/80"
                                    >
                                      Korrigieren
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(log)}
                                      disabled={isSaving}
                                      className="rounded-xl border border-danger/35 bg-danger-soft px-2.5 py-1 text-[11px] text-danger-foreground transition-all active:scale-95 disabled:opacity-50 md:hover:bg-danger-soft/80"
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
          <div className="no-print rounded-2xl bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">PDF, Lohnbüro & DATEV — ab Business</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Am Monatsende direkt ans Lohnbüro senden oder DATEV-CSV ziehen (79 €/Monat).
              </p>
            </div>
            <a
              href={BUSINESS_UPGRADE_PATH}
              className="shrink-0 rounded-2xl bg-primary px-4 py-2 text-sm font-bold text-foreground transition-all active:scale-95 md:hover:bg-primary/90"
            >
              Business ansehen
            </a>
          </div>
        )}
      </motion.div>

      <ToastContainer toasts={toasts} remove={remove} />
      {editingLog && (
        <motion.div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-background/75 px-4">
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
                className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none focus:border-brand"
              />
              <input
                type="datetime-local"
                value={editClockOut}
                onChange={(e) => setEditClockOut(e.target.value)}
                className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none focus:border-brand"
              />
              <input
                type="number"
                min={0}
                max={480}
                value={editBreakMins}
                onChange={(e) => setEditBreakMins(e.target.value)}
                placeholder="Pause in Minuten"
                className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none focus:border-brand"
              />
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as LogRow["status"])}
                className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none focus:border-brand"
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
                className="sm:col-span-2 rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none focus:border-brand"
              />
              <input
                type="text"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Notiz (optional)"
                className="sm:col-span-2 rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none focus:border-brand"
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
        </motion.div>
      )}
      {showPayrollModal && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-background/75 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
            <h3 className="text-base font-semibold">An Lohnbüro senden</h3>
            <p className="mt-1 text-xs text-muted-foreground">Der aktuelle PDF-Report wird als Anhang per E-Mail versendet.</p>
            <label className="mt-4 block text-xs text-muted-foreground">E-Mail Lohnbüro (mehrere mit ; trennen)</label>
            <input
              type="text"
              value={payrollEmail}
              onChange={(e) => setPayrollEmail(e.target.value)}
              placeholder="lohnbuero@beispiel.de; chef@beispiel.de"
              className="mt-1 w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none focus:border-brand"
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

    </>
  );
}
