/**
 * Transaktionale E-Mail-Helfer.
 *
 * WICHTIG: Diese Datei ist absichtlich **kein** `"use server"`-Modul.
 * Die Funktionen sind reine Server-Helper, die ausschließlich aus
 * geprüften Server-Kontexten aufgerufen werden dürfen (Server-Actions,
 * Route-Handler, Cron-Jobs). Würden sie als Server-Actions exportiert,
 * könnten sie vom Client mit beliebigen Empfänger-Adressen / Tokens
 * aufgerufen werden (E-Mail-Spoofing / Token-Spam).
 */

import { Resend } from "resend";
import {
  welcomeEmailHtml,
  passwordResetEmailHtml,
  vacationStatusEmailHtml,
  verificationEmailHtml,
  noShowReminderEmailHtml,
  trialReminderEmailHtml,
} from "@/lib/email/templates";
import type { TrialReminderKind } from "@/lib/trial/reminders";
import { trialReminderSubject } from "@/lib/trial/reminders";

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@vrema.app";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "https://vrema.app").replace(/\/$/, "");

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizeRecipients(input: string) {
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

/** Sendet eine einzelne E-Mail; loggt aber wirft nicht (außer optional). */
async function sendInternal(to: string, subject: string, html: string) {
  if (!resendClient) {
    console.warn("[Resend] RESEND_API_KEY fehlt – E-Mail wird übersprungen:", subject, to);
    return;
  }
  const { error } = await resendClient.emails.send({ from: FROM, to, subject, html });
  if (error) {
    console.error("[Resend] E-Mail-Versand fehlgeschlagen:", error);
  }
}

// ─── Welcome / Manager-erstellt ───────────────────────────────────────────────
export async function sendWelcomeEmail(data: {
  recipientName: string;
  recipientEmail: string;
  companyName: string;
  tempPassword: string;
}) {
  const dashboardUrl = `${APP_URL}/auth/login`;
  await sendInternal(
    data.recipientEmail,
    `Willkommen bei VREMA – ${data.companyName}`,
    welcomeEmailHtml({
      recipientName: data.recipientName,
      companyName: data.companyName,
      email: data.recipientEmail,
      tempPassword: data.tempPassword,
      dashboardUrl,
    }),
  );
}

// ─── Team-Invite (selbst gewähltes Passwort) ──────────────────────────────────
export async function sendTeamInviteWelcomeEmail(data: {
  recipientName: string;
  recipientEmail: string;
  companyName: string;
}) {
  const dashboardUrl = `${APP_URL}/dashboard/welcome`;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#0b0b0b;color:#f4f4f5;padding:20px;">
      <div style="max-width:560px;margin:0 auto;background:#111;border:1px solid #1f1f1f;border-radius:14px;padding:26px;">
        <p style="margin:0 0 8px;color:#0a3a52;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">Team-Einladung bestätigt</p>
        <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">Willkommen im Team von ${data.companyName}!</h1>
        <p style="margin:0 0 18px;color:#a1a1aa;line-height:1.6;">
          Hi ${data.recipientName}, dein VREMA-Zugang wurde erfolgreich angelegt.
          Deine Arbeitszeiterfassung ist jetzt bereit.
        </p>
        <p style="margin:0 0 8px;color:#a1a1aa;font-size:13px;">Konto: ${data.recipientEmail}</p>
        <a href="${dashboardUrl}" style="display:inline-block;margin-top:12px;padding:11px 18px;background:#0a3a52;color:#ffffff;text-decoration:none;font-weight:700;border-radius:10px;">
          Zum Startbereich
        </a>
      </div>
    </div>
  `;

  await sendInternal(
    data.recipientEmail,
    `Willkommen im Team von ${data.companyName} – VREMA`,
    html,
  );
}

// ─── Password-Reset ───────────────────────────────────────────────────────────
export async function sendPasswordResetEmail(
  recipientEmail: string,
  resetToken: string,
  recipientName = "VREMA Nutzer",
) {
  const resetUrl = `${APP_URL}/auth/reset-password?token=${resetToken}`;
  await sendInternal(
    recipientEmail,
    "Passwort zurücksetzen – VREMA",
    passwordResetEmailHtml({ recipientName, resetUrl }),
  );
}

// ─── Urlaubs-Status ───────────────────────────────────────────────────────────
export async function sendVacationStatusEmail(data: {
  recipientName: string;
  recipientEmail: string;
  status: "APPROVED" | "REJECTED";
  startDate: Date;
  endDate: Date;
  days: number;
  approvedByName: string;
  decisionNote?: string;
}) {
  const fmt = (d: Date) =>
    d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Europe/Berlin",
    });

  await sendInternal(
    data.recipientEmail,
    `Urlaubsantrag ${data.status === "APPROVED" ? "genehmigt" : "abgelehnt"} – VREMA`,
    vacationStatusEmailHtml({
      recipientName: data.recipientName,
      status: data.status,
      startDate: fmt(data.startDate),
      endDate: fmt(data.endDate),
      days: data.days,
      approvedByName: data.approvedByName,
      decisionNote: data.decisionNote,
    }),
  );
}

// ─── No-Show / Schicht-Erinnerung ─────────────────────────────────────────────
export async function sendNoShowReminderEmail(data: {
  recipientName: string;
  recipientEmail: string;
  companyName: string;
  startTime: string;
  endTime: string;
  minutesLate: number;
}) {
  if (!resendClient) {
    throw new Error("E-Mail-Versand ist nicht eingerichtet. Bitte RESEND_API_KEY setzen.");
  }
  const clockInUrl = `${APP_URL}/dashboard?action=clockin`;
  const { error } = await resendClient.emails.send({
    from: FROM,
    to: data.recipientEmail,
    subject: `Erinnerung: Schicht ${data.startTime} – ${data.endTime} · ${data.companyName}`,
    html: noShowReminderEmailHtml({
      recipientName: data.recipientName,
      companyName: data.companyName,
      startTime: data.startTime,
      endTime: data.endTime,
      minutesLate: data.minutesLate,
      clockInUrl,
    }),
  });
  if (error) {
    console.error("[Resend] No-Show-Erinnerung fehlgeschlagen:", error);
    throw new Error("E-Mail konnte nicht gesendet werden.");
  }
}

// ─── Trial-Ende-Erinnerungen (Cron) ───────────────────────────────────────────
export async function sendTrialReminderEmail(data: {
  kind: TrialReminderKind;
  recipientName: string;
  recipientEmail: string;
  companyName: string;
  daysRemaining: number;
  trialEndsAt: Date;
  flyerCampaignLabel?: string | null;
}) {
  const billingUrl =
    data.kind === "expired"
      ? `${APP_URL}/dashboard/trial-ended`
      : `${APP_URL}/dashboard/billing`;
  const trialEndsAtLabel = data.trialEndsAt.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });

  await sendInternal(
    data.recipientEmail,
    trialReminderSubject(data.kind, data.companyName),
    trialReminderEmailHtml({
      recipientName: data.recipientName,
      companyName: data.companyName,
      kind: data.kind,
      daysRemaining: data.daysRemaining,
      trialEndsAtLabel,
      billingUrl,
      flyerCampaignLabel: data.flyerCampaignLabel,
    }),
  );
}

// ─── E-Mail-Verifizierung ─────────────────────────────────────────────────────
export async function sendVerificationEmail(data: {
  recipientName: string;
  recipientEmail: string;
  verifyUrl: string;
}) {
  await sendInternal(
    data.recipientEmail,
    "VREMA – E-Mail bestätigen",
    verificationEmailHtml({
      recipientName: data.recipientName,
      verifyUrl: data.verifyUrl,
    }),
  );
}

/**
 * Low-Level Versand mit PDF/CSV-Anhang.
 * Aufrufer (Server-Action) ist verantwortlich für Auth + Rollen-/Plan-Prüfung.
 */
export async function sendPayrollReportInternal(data: {
  recipients: string[];
  companyName: string;
  month: string;
  totalHours: string;
  entries: number;
  attachmentFileName: string;
  attachmentBase64: string;
  attachmentMimeType?: string;
  attachmentLabel?: string;
}) {
  if (!resendClient) {
    throw new Error("Resend ist nicht konfiguriert.");
  }

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

  const { error } = await resendClient.emails.send({
    from: FROM,
    to: data.recipients,
    subject,
    html,
    attachments: [
      {
        filename: data.attachmentFileName,
        content: data.attachmentBase64,
        contentType: data.attachmentMimeType ?? "application/pdf",
      },
    ],
  });
  if (error) {
    console.error("[Resend] Payroll-Versand fehlgeschlagen:", error);
    throw new Error("Versand an Lohnbüro fehlgeschlagen.");
  }
}
