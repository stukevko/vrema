"use server";

import { Resend } from "resend";
import {
  welcomeEmailHtml,
  passwordResetEmailHtml,
  vacationStatusEmailHtml,
  verificationEmailHtml,
} from "@/lib/email/templates";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@vrema.app";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "https://vrema.app").replace(/\/$/, "");

// ── Helper ────────────────────────────────────────────────────────────────────
async function send(to: string, subject: string, html: string) {
  if (!resend) {
    console.warn("[Resend] RESEND_API_KEY fehlt - E-Mail wird übersprungen:", subject, to);
    return;
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) {
    console.error("[Resend] Failed to send email:", error);
    // Non-fatal – log but don't crash the calling action
  }
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeRecipients(input: string) {
  const list = input
    .split(/[;,]/g)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const unique = Array.from(new Set(list));
  if (!unique.length) throw new Error("Bitte mindestens eine gültige Empfängeradresse eingeben.");
  const invalid = unique.find((e) => !isValidEmail(e));
  if (invalid) throw new Error(`Ungültige E-Mail-Adresse: ${invalid}`);
  return unique;
}

// ── Welcome / Invite ──────────────────────────────────────────────────────────
export async function sendWelcomeEmail(data: {
  recipientName: string;
  recipientEmail: string;
  companyName: string;
  tempPassword: string;
}) {
  const dashboardUrl = `${APP_URL}/auth/login`;

  await send(
    data.recipientEmail,
    `Willkommen bei Vrema – ${data.companyName}`,
    welcomeEmailHtml({
      recipientName: data.recipientName,
      companyName: data.companyName,
      email: data.recipientEmail,
      tempPassword: data.tempPassword,
      dashboardUrl,
    })
  );
}

// ── Team invite welcome (self-chosen password) ───────────────────────────────
export async function sendTeamInviteWelcomeEmail(data: {
  recipientName: string;
  recipientEmail: string;
  companyName: string;
}) {
  const dashboardUrl = `${APP_URL}/dashboard/welcome`;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#0b0b0b;color:#f4f4f5;padding:20px;">
      <div style="max-width:560px;margin:0 auto;background:#111;border:1px solid #1f1f1f;border-radius:14px;padding:26px;">
        <p style="margin:0 0 8px;color:#22c55e;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">Team-Einladung bestätigt</p>
        <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">Willkommen im Team von ${data.companyName}!</h1>
        <p style="margin:0 0 18px;color:#a1a1aa;line-height:1.6;">
          Hi ${data.recipientName}, dein VREMA-Zugang wurde erfolgreich angelegt.
          Deine Arbeitszeiterfassung ist jetzt bereit.
        </p>
        <p style="margin:0 0 8px;color:#a1a1aa;font-size:13px;">Konto: ${data.recipientEmail}</p>
        <a href="${dashboardUrl}" style="display:inline-block;margin-top:12px;padding:11px 18px;background:#22c55e;color:#03120a;text-decoration:none;font-weight:700;border-radius:10px;">
          Zum Startbereich
        </a>
      </div>
    </div>
  `;

  await send(
    data.recipientEmail,
    `Willkommen im Team von ${data.companyName} - VREMA`,
    html
  );
}

// ── Password Reset ────────────────────────────────────────────────────────────
export async function sendPasswordResetEmail(
  recipientEmail: string,
  resetToken: string,
  recipientName = "Vrema Nutzer"
) {
  const resetUrl = `${APP_URL}/auth/reset-password?token=${resetToken}`;

  await send(
    recipientEmail,
    "Passwort zurücksetzen – Vrema",
    passwordResetEmailHtml({
      recipientName,
      resetUrl,
    })
  );
}

// ── Vacation status notification ──────────────────────────────────────────────
export async function sendVacationStatusEmail(data: {
  recipientName: string;
  recipientEmail: string;
  status: "APPROVED" | "REJECTED";
  startDate: Date;
  endDate: Date;
  days: number;
  approvedByName: string;
}) {
  const fmt = (d: Date) =>
    d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

  await send(
    data.recipientEmail,
    `Urlaubsantrag ${data.status === "APPROVED" ? "genehmigt" : "abgelehnt"} – Vrema`,
    vacationStatusEmailHtml({
      recipientName: data.recipientName,
      status: data.status,
      startDate: fmt(data.startDate),
      endDate: fmt(data.endDate),
      days: data.days,
      approvedByName: data.approvedByName,
    })
  );
}

// ── Email verification ────────────────────────────────────────────────────────
export async function sendVerificationEmail(data: {
  recipientName: string;
  recipientEmail: string;
  verifyUrl: string;
}) {
  await send(
    data.recipientEmail,
    "VREMA - E-Mail bestätigen",
    verificationEmailHtml({
      recipientName: data.recipientName,
      verifyUrl: data.verifyUrl,
    })
  );
}

export async function sendPayrollReportEmail(data: {
  recipientEmail: string;
  companyName: string;
  month: string;
  totalHours: string;
  entries: number;
  attachmentFileName: string;
  attachmentBase64: string;
  attachmentMimeType?: string;
  attachmentLabel?: string;
  csvFileName?: string;
  csvContent?: string;
}) {
  if (!resend) {
    throw new Error("Resend ist nicht konfiguriert.");
  }
  const recipients = normalizeRecipients(data.recipientEmail);

  const subject = `VREMA Lohnbüro-Export ${data.month} – ${data.companyName}`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#0b0b0b;color:#f4f4f5;padding:20px;">
      <h2 style="margin:0 0 10px;">VREMA Lohnbüro-Export</h2>
      <p style="margin:0 0 8px;">Firma: <strong>${data.companyName}</strong></p>
      <p style="margin:0 0 8px;">Zeitraum: <strong>${data.month}</strong></p>
      <p style="margin:0 0 8px;">Gesamtstunden: <strong>${data.totalHours}</strong></p>
      <p style="margin:0 0 16px;">Einträge: <strong>${data.entries}</strong></p>
      <p style="margin:0;color:#a1a1aa;">${data.attachmentLabel ?? "Der Report"} ist als Anhang beigefügt.</p>
    </div>
  `;

  const filename = data.attachmentFileName ?? data.csvFileName ?? "report.pdf";
  const content = data.attachmentBase64 ?? data.csvContent ?? "";
  const contentType = data.attachmentMimeType ?? "application/pdf";

  const { error } = await resend.emails.send({
    from: FROM,
    to: recipients,
    subject,
    html,
    attachments: [
      {
        filename,
        content,
        contentType,
      },
    ],
  });
  if (error) {
    console.error("[Resend] Payroll report send failed:", error);
    throw new Error("Versand an Lohnbüro fehlgeschlagen.");
  }
}
