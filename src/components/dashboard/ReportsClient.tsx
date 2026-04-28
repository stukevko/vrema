"use client";

import { motion } from "framer-motion";
import { FileText, Mail, MapPin, Clock, Lock, Download, TriangleAlert, FileSpreadsheet } from "lucide-react";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { useState, useTransition } from "react";
import {
  createWorkLogCorrectionRequest,
  decideWorkLogCorrectionRequest,
  deleteWorkLogByManager,
  updateWorkLogByManager,
} from "@/lib/actions/worklogs";
import { sendPayrollReportEmail } from "@/lib/actions/emails";
import { minutesToDecimalHours, workedMinutes } from "@/lib/time/payroll";
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
  latitude: number | null;
  longitude: number | null;
  isOutOfRange?: boolean;
};

interface Props {
  logs: LogRow[];
  totalMinutes: number;
  month: string;
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

function employeeNumberOrFallback(log: LogRow) {
  if (log.employeeNumber && log.employeeNumber.trim()) return log.employeeNumber.trim();
  return `MA-${log.userId.slice(-6).toUpperCase()}`;
}

function formatForDateTimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
      onClick={locked ? onLockedClick : onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-mono font-medium transition-all border ${
        locked
          ? "bg-white/[0.02] border-white/[0.06] text-white/30 cursor-pointer hover:bg-white/[0.05]"
          : "bg-[#22c55e] border-[#22c55e] text-black hover:bg-[#16a34a]"
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
  plan,
  isManager,
  companyName,
  monthlySollMinutesByUser,
  absences,
  correctionRequests,
}: Props) {
  const { toasts, show, remove } = useToast();
  const [isSaving, startTransition] = useTransition();
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

  const lockedMsg = () => show("Upgrade erforderlich", "info");

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
      doc.text(companyName || "Firmenreport", pageWidth / 2, 11, { align: "center" });
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
          const week = `${inAt.getFullYear()}-${Math.ceil((inAt.getDate() + new Date(inAt.getFullYear(), inAt.getMonth(), 1).getDay()) / 7)}`;
          if (dur && dur > 0) weekBuckets.set(week, (weekBuckets.get(week) ?? 0) + Math.round(dur));
          return [
            inAt.toLocaleDateString("de-DE"),
            inAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
            outAt ? outAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "-",
            `${log.breakMins} min`,
            dur !== null ? formatMins(dur) : "-",
            statusLabel(log.status),
            log.note ?? "",
          ];
        });

      autoTable(doc, {
        startY: sectionStartY + 15,
        head: [["Datum", "Einstempel", "Ausstempel", "Pause", "Dauer", "Status", "Notiz"]],
        body: sortedLogs,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 1.6, lineColor: [220, 220, 220], lineWidth: 0.1 },
        headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        columnStyles: {
          0: { cellWidth: 23 },
          1: { cellWidth: 20 },
          2: { cellWidth: 20 },
          3: { cellWidth: 18 },
          4: { cellWidth: 20 },
          5: { cellWidth: 24 },
          6: { cellWidth: "auto" },
        },
        didParseCell: (data) => {
          if (data.section !== "body" || data.column.index !== 5) return;
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
            const s = new Date(a.startDate).toLocaleDateString("de-DE");
            const e = new Date(a.endDate).toLocaleDateString("de-DE");
            return `${a.type === "SICK" ? "Krank" : "Urlaub"} ${s}${s === e ? "" : ` - ${e}`}`;
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
    const headers = [
      "Datensatz_Typ",
      "Lohnart_Code",
      "Lohnart_Text",
      ...(isManager ? ["Mitarbeiter_Nr", "Mitarbeiter"] : []),
      "Datum",
      "Einstempel",
      "Ausstempel",
      "Pause_Minuten",
      "Arbeitszeit_Netto_Minuten",
      "Dauer_Dezimal_Stunden",
      "Soll_Stunden_Monat",
      "Ist_Stunden_Monat",
      "Differenz_Stunden",
      "Status",
      "Status_Code",
      "GPS_Latitude",
      "GPS_Longitude",
      "Notiz",
    ];
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
        const durationMinutes = dur !== null ? Math.round(dur) : "";
        rows.push([
          "DETAIL",
          "001",
          "Arbeitszeit",
          ...(isManager ? [mitarbeiterNr, log.userName] : []),
          formatDateDE(inAt),
          inAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
          outAt ? outAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "",
          log.breakMins,
          durationMinutes,
          durationMinutes !== "" ? decimalHoursDE(durationMinutes) : "",
          "",
          "",
          "",
          statusLabel(log.status),
          log.status,
          log.latitude ?? "",
          log.longitude ?? "",
          log.note ?? "",
        ]);
      });

      const userAbsences = (absencesByUser[first.userId] ?? []).slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
      userAbsences.forEach((a) => {
        const s = new Date(a.startDate);
        const e = new Date(a.endDate);
        rows.push([
          "ABSENCE",
          "",
          "",
          ...(isManager ? [mitarbeiterNr, first.userName] : []),
          formatDateDE(s),
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          a.type === "SICK" ? "Krank" : "Urlaub",
          a.type,
          "",
          "",
          s.getTime() === e.getTime() ? "" : `bis ${formatDateDE(e)}`,
        ]);
      });

      rows.push([
        "SUMMARY",
          "001",
          "Arbeitszeit",
        ...(isManager ? [mitarbeiterNr, first.userName] : []),
        "",
        "",
        "",
        "",
        "",
        "",
        decimalHoursDE(userSoll),
        decimalHoursDE(userIst),
        decimalHoursDE(diff),
        "Monatssumme",
        "SUMMARY",
        "",
        "",
        "",
      ]);
      if (diff > 0) {
        rows.push([
          "SUMMARY_OVERTIME",
          "002",
          "Überstunden",
          ...(isManager ? [mitarbeiterNr, first.userName] : []),
          "",
          "",
          "",
          "",
          diff,
          decimalHoursDE(diff),
          "",
          "",
          "",
          "Überstunden",
          "OVERTIME",
          "",
          "",
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
        show(`PDF-Report erfolgreich an ${recipientEmail} gesendet.`, "success");
        setShowPayrollModal(false);
      } catch (err: unknown) {
        show(err instanceof Error ? err.message : "Versand fehlgeschlagen.", "error");
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
        show(err instanceof Error ? err.message : "Update fehlgeschlagen.", "error");
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
        show(err instanceof Error ? err.message : "Update fehlgeschlagen.", "error");
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
        show(err instanceof Error ? err.message : "Löschen fehlgeschlagen.", "error");
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
        show(err instanceof Error ? err.message : "Antrag konnte nicht gesendet werden.", "error");
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
        show(err instanceof Error ? err.message : "Aktion fehlgeschlagen.", "error");
      }
    });
  };

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Berichte</h1>
            <p className="text-white/40 text-sm mt-1 font-mono">{month} · {logs.length} Einträge</p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <PlanGateButton
              icon={Download}
              label="$ export --pdf"
              plan={plan}
              requiredPlan="BUSINESS"
              onLockedClick={lockedMsg}
              onClick={exportPdf}
            />
            <PlanGateButton
              icon={Mail}
              label="$ send --lohnbuero"
              plan={plan}
              requiredPlan="BUSINESS"
              onLockedClick={lockedMsg}
              onClick={sendToPayroll}
            />
            <PlanGateButton
              icon={FileSpreadsheet}
              label="$ export --csv"
              plan={plan}
              requiredPlan="BUSINESS"
              onLockedClick={lockedMsg}
              onClick={exportCsv}
            />
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Einträge gesamt", value: logs.length.toString(), color: "#60a5fa" },
            { label: "Gesamtzeit", value: formatMins(totalMinutes), color: "#22c55e" },
            { label: "Ø pro Eintrag", value: logs.length ? formatMins(totalMinutes / logs.length) : "–", color: "#22c55e" },
            { label: "GPS-gestempelt", value: logs.filter((l) => l.latitude).length.toString(), color: "#f59e0b" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-[#141414] border border-white/5 p-4">
              <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {isManager && (
          <div className="rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-xs text-white/60">
            Status-Legende: <span className="text-emerald-300">Pünktlich</span> ·{" "}
            <span className="text-amber-300">Zu spät (&gt;15 Min nach Schichtbeginn)</span> ·{" "}
            <span className="text-red-300">Fehlend (automatisch per Cron)</span> ·{" "}
            <span className="text-sky-300">Manuell angepasst</span>
          </div>
        )}

        <div className="rounded-2xl bg-[#141414] border border-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Zeitkorrektur-Anträge</h2>
            <span className="text-[11px] text-white/35 font-mono">
              {correctionRequests.filter((r) => r.status === "PENDING").length} offen
            </span>
          </div>

          {!isManager && (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="sm:col-span-2 rounded-xl border border-white/10 bg-[#0b0b0b] px-3 py-2.5">
                <p className="text-[11px] text-white/45 mb-2">Schritt 1: Was willst du korrigieren?</p>
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
                  className="sm:col-span-2 rounded-xl border border-white/10 bg-[#0b0b0b] px-3 py-2 text-sm"
                >
                  <option value="">Bitte Eintrag wählen…</option>
                  {logs.slice(0, 25).map((log) => (
                    <option key={log.id} value={log.id}>
                      {new Date(log.clockIn).toLocaleDateString("de-DE")} {new Date(log.clockIn).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                    </option>
                  ))}
                </select>
              )}
              <label className="text-[11px] text-white/45">{requestMode === "existing" ? "Schritt 2: Neue Einstempelzeit" : "Schritt 2: Einstempelzeit"}</label>
              <label className="text-[11px] text-white/45">{requestMode === "existing" ? "Neue Ausstempelzeit (optional)" : "Ausstempelzeit (optional)"}</label>
              <input
                type="datetime-local"
                value={requestClockIn}
                onChange={(e) => setRequestClockIn(e.target.value)}
                placeholder="Einstempelzeit"
                className="rounded-xl border border-white/10 bg-[#0b0b0b] px-3 py-2 text-sm"
              />
              <input
                type="datetime-local"
                value={requestClockOut}
                onChange={(e) => setRequestClockOut(e.target.value)}
                placeholder="Ausstempelzeit (optional)"
                className="rounded-xl border border-white/10 bg-[#0b0b0b] px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                max={480}
                value={requestBreakMins}
                onChange={(e) => setRequestBreakMins(e.target.value)}
                placeholder="Pause in Minuten (z.B. 30)"
                className="rounded-xl border border-white/10 bg-[#0b0b0b] px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="Schritt 3: Begründung (Pflicht)"
                className="rounded-xl border border-white/10 bg-[#0b0b0b] px-3 py-2 text-sm sm:col-span-2"
              />
              <input
                type="text"
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="Notiz (optional)"
                className="rounded-xl border border-white/10 bg-[#0b0b0b] px-3 py-2 text-sm sm:col-span-2"
              />
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={submitCorrectionRequest}
                  disabled={isSaving}
                  className="rounded-lg bg-[#22c55e] px-3 py-2 text-xs font-semibold text-black hover:bg-[#16a34a] disabled:opacity-60"
                >
                  Antrag senden
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {correctionRequests.length === 0 ? (
              <p className="text-xs text-white/35">Noch keine Anträge vorhanden.</p>
            ) : (
              correctionRequests.map((req) => (
                <div key={req.id} className="rounded-xl border border-white/10 bg-[#0f0f0f] p-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{req.userName}</span>
                    <span className="text-white/45">{new Date(req.requestedClockIn).toLocaleString("de-DE")}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        req.status === "PENDING"
                          ? "bg-amber-500/20 text-amber-300"
                          : req.status === "APPROVED"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <p className="mt-1 text-white/70">Grund: {req.reason}</p>
                  {req.requestedNote && <p className="mt-1 text-white/50">Notiz: {req.requestedNote}</p>}
                  {req.status !== "PENDING" && req.reviewerName && (
                    <p className="mt-1 text-white/45">Bearbeitet von: {req.reviewerName}</p>
                  )}
                  {isManager && req.status === "PENDING" && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => decideCorrectionRequest(req.id, "APPROVE")}
                        className="rounded-lg border border-emerald-400/30 px-2.5 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/10"
                        disabled={isSaving}
                      >
                        Freigeben & buchen
                      </button>
                      <button
                        type="button"
                        onClick={() => decideCorrectionRequest(req.id, "REJECT")}
                        className="rounded-lg border border-red-400/30 px-2.5 py-1 text-[11px] text-red-300 hover:bg-red-500/10"
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
        <div className="rounded-2xl bg-[#141414] border border-white/5 overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
            <FileText className="w-4 h-4 text-white/30" />
            <span className="text-sm font-semibold">Work-Logs – {month}</span>
          </div>

          {logs.length === 0 ? (
            <div className="py-16 text-center">
              <Clock className="w-8 h-8 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/20 font-mono">Keine Einträge in diesem Monat.</p>
            </div>
          ) : (
            <div className="max-h-[72vh] overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="sticky top-0 z-20 border-b border-white/5 bg-[#141414]">
                    {[
                      isManager ? "Mitarbeiter" : null,
                      "Datum",
                      "Einstempel",
                      "Ausstempel",
                      "Pause",
                      "Dauer",
                      "Status",
                      "GPS",
                      "Notiz",
                      isManager ? "Aktion" : null,
                    ]
                      .filter(Boolean)
                      .map((h) => (
                        <th key={h!} className="px-5 py-3 text-left text-[10px] text-white/30 font-mono uppercase tracking-widest">
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
                        className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                      >
                        {isManager && (
                          <td className="px-5 py-3">
                            <span className="text-white/70 font-medium">{log.userName}</span>
                          </td>
                        )}
                        <td className="px-5 py-3 font-mono text-white/50 text-xs">
                          {clockInDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                        </td>
                        <td className="px-5 py-3 font-mono text-[#22c55e]">
                          {clockInDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-5 py-3 font-mono text-white/60">
                          {log.clockOut
                            ? new Date(log.clockOut).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
                            : <span className="text-amber-400 animate-pulse">läuft…</span>}
                        </td>
                        <td className="px-5 py-3 font-mono text-white/40 text-xs">
                          {log.breakMins > 0 ? `${log.breakMins}min` : "–"}
                        </td>
                        <td className="px-5 py-3 font-mono font-bold text-white/80">
                          {dur !== null ? formatMins(dur) : "–"}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              log.status === "ABSENT"
                                ? "bg-red-500/20 text-red-300"
                                : log.status === "LATE"
                                  ? "bg-amber-500/20 text-amber-300"
                                  : log.status === "MANUAL_ADJUSTED"
                                    ? "bg-sky-500/20 text-sky-300"
                                    : "bg-emerald-500/20 text-emerald-300"
                            }`}
                          >
                            {statusLabel(log.status)}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {log.latitude ? (
                            <span title={`${log.latitude?.toFixed(4)}, ${log.longitude?.toFixed(4)}`}>
                              <MapPin className="w-3.5 h-3.5 text-[#22c55e]" />
                            </span>
                          ) : (
                            <span className="text-white/10">–</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-white/30 text-xs max-w-[120px] truncate">
                          <span className="inline-flex items-center gap-1.5">
                            {log.isOutOfRange && (
                              <TriangleAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            )}
                            {log.note ?? "–"}
                          </span>
                        </td>
                        {isManager && (
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleEdit(log)}
                                disabled={isSaving}
                                className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-white/60 hover:bg-white/5 disabled:opacity-50"
                              >
                                Bearbeiten
                              </button>
                              {log.status === "ABSENT" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleAbsentOverride(log)}
                                    disabled={isSaving}
                                    className="rounded-lg border border-amber-300/30 px-2.5 py-1 text-[11px] text-amber-200 hover:bg-amber-300/10 disabled:opacity-50"
                                  >
                                    Korrigieren
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(log)}
                                    disabled={isSaving}
                                    className="rounded-lg border border-red-400/30 px-2.5 py-1 text-[11px] text-red-300 hover:bg-red-500/10 disabled:opacity-50"
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
          )}
        </div>

        {/* Upgrade hint for locked features */}
        {plan === "STARTER" && (
          <div className="rounded-2xl bg-[#22c55e]/5 border border-[#22c55e]/15 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm">PDF-Export & Lohnbüro-Versand freischalten</p>
              <p className="text-xs text-white/40 mt-1 font-mono">
                $ vrema upgrade --plan business → Monatsberichte auf Knopfdruck
              </p>
            </div>
            <a
              href="/dashboard/billing"
              className="shrink-0 px-4 py-2 rounded-xl bg-[#22c55e] text-black text-sm font-bold hover:bg-[#16a34a] transition-colors font-mono"
            >
              Upgrade
            </a>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} remove={remove} />
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#121212] p-5">
            <h3 className="text-base font-semibold">Zeiteintrag bearbeiten</h3>
            <p className="mt-1 text-xs text-white/45">
              Für Nachvollziehbarkeit wird die Änderung automatisch als Manager-Edit protokolliert.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <input
                type="datetime-local"
                value={editClockIn}
                onChange={(e) => setEditClockIn(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#0b0b0b] px-3 py-2.5 text-sm text-white outline-none focus:border-[#22c55e]/50"
              />
              <input
                type="datetime-local"
                value={editClockOut}
                onChange={(e) => setEditClockOut(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#0b0b0b] px-3 py-2.5 text-sm text-white outline-none focus:border-[#22c55e]/50"
              />
              <input
                type="number"
                min={0}
                max={480}
                value={editBreakMins}
                onChange={(e) => setEditBreakMins(e.target.value)}
                placeholder="Pause in Minuten"
                className="rounded-xl border border-white/10 bg-[#0b0b0b] px-3 py-2.5 text-sm text-white outline-none focus:border-[#22c55e]/50"
              />
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as LogRow["status"])}
                className="rounded-xl border border-white/10 bg-[#0b0b0b] px-3 py-2.5 text-sm text-white outline-none focus:border-[#22c55e]/50"
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
                className="sm:col-span-2 rounded-xl border border-white/10 bg-[#0b0b0b] px-3 py-2.5 text-sm text-white outline-none focus:border-[#22c55e]/50"
              />
              <input
                type="text"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Notiz (optional)"
                className="sm:col-span-2 rounded-xl border border-white/10 bg-[#0b0b0b] px-3 py-2.5 text-sm text-white outline-none focus:border-[#22c55e]/50"
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingLog(null)}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/5"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={submitEdit}
                disabled={isSaving}
                className="rounded-lg bg-[#22c55e] px-3 py-2 text-xs font-semibold text-black hover:bg-[#16a34a] disabled:opacity-60"
              >
                {isSaving ? "Speichere..." : "Änderung speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showPayrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121212] p-5">
            <h3 className="text-base font-semibold">An Lohnbüro senden</h3>
            <p className="mt-1 text-xs text-white/45">Der aktuelle PDF-Report wird als Anhang per E-Mail versendet.</p>
            <label className="mt-4 block text-xs text-white/55">E-Mail Lohnbüro (mehrere mit ; trennen)</label>
            <input
              type="text"
              value={payrollEmail}
              onChange={(e) => setPayrollEmail(e.target.value)}
              placeholder="lohnbuero@beispiel.de; chef@beispiel.de"
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b0b0b] px-3 py-2.5 text-sm text-white outline-none focus:border-[#22c55e]/50"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPayrollModal(false)}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/5"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={confirmSendToPayroll}
                disabled={isSaving}
                className="rounded-lg bg-[#22c55e] px-3 py-2 text-xs font-semibold text-black hover:bg-[#16a34a] disabled:opacity-60"
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
