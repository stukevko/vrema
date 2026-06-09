// ─────────────────────────────────────────────────────────────────────────────
// VREMA Email Templates  (dark, terminal-style HTML)
// ─────────────────────────────────────────────────────────────────────────────

const BASE = {
  bg: "#080808",
  card: "#111111",
  border: "#1f1f1f",
  accent: "#22c55e",
  textPrimary: "#f5f5f5",
  textMuted: "#6b7280",
  font: "ui-monospace, 'Cascadia Code', 'Fira Code', monospace",
};
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "https://vrema.app").replace(/\/$/, "");

function layout(title: string, body: string): string {
  return /* html */ `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BASE.bg};font-family:${BASE.font};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BASE.bg};padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;">

        <!-- Logo bar -->
        <tr>
          <td style="padding-bottom:24px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;">
                  <img src="${APP_URL}/vrema_logo_icon.png" alt="VREMA – Schichtplanung und Zeiterfassung für Teams" width="40" height="40" style="display:block;" />
                </td>
                <td style="padding-left:10px;vertical-align:middle;">
                  <span style="color:${BASE.textPrimary};font-size:16px;font-weight:700;">Vrema</span>
                  <span style="color:${BASE.textMuted};font-size:11px;margin-left:6px;">by KevkoStudio</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:${BASE.card};border:1px solid ${BASE.border};border-radius:16px;padding:36px 32px;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding-top:24px;text-align:center;color:${BASE.textMuted};font-size:11px;line-height:1.6;">
            © 2026 Vrema by KevkoStudio · Kolbstr. 5 · 67346 Speyer<br/>
            <a href="${APP_URL}" style="color:${BASE.accent};text-decoration:none;">vrema.app</a>
            &nbsp;·&nbsp;
            <a href="${APP_URL}/datenschutz" style="color:${BASE.textMuted};text-decoration:none;">Datenschutz</a>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function kv(key: string, value: string): string {
  return /* html */ `
  <tr>
    <td style="color:${BASE.textMuted};font-size:12px;padding:4px 0;white-space:nowrap;">${key}</td>
    <td style="color:${BASE.textPrimary};font-size:12px;padding:4px 0 4px 16px;font-weight:600;">${value}</td>
  </tr>`;
}

// ── Welcome / Invite ─────────────────────────────────────────────────────────
export function welcomeEmailHtml(data: {
  recipientName: string;
  companyName: string;
  email: string;
  tempPassword: string;
  dashboardUrl: string;
}): string {
  const body = /* html */ `
    <h1 style="color:${BASE.textPrimary};font-size:22px;font-weight:700;margin:0 0 8px;">
      Willkommen bei Vrema 👋
    </h1>
    <p style="color:${BASE.textMuted};font-size:14px;margin:0 0 28px;line-height:1.6;">
      Hi <strong style="color:${BASE.textPrimary};">${data.recipientName}</strong>,<br/>
      du wurdest von <strong style="color:${BASE.textPrimary};">${data.companyName}</strong> zu Vrema eingeladen.
      Hier sind deine Zugangsdaten:
    </p>

    <!-- Credentials terminal block -->
    <div style="background:${BASE.bg};border:1px solid ${BASE.border};border-radius:12px;padding:20px 24px;margin-bottom:28px;">
      <div style="color:${BASE.accent};font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;">
        # zugangsdaten.env
      </div>
      <table cellpadding="0" cellspacing="0" width="100%">
        ${kv("APP_URL", data.dashboardUrl)}
        ${kv("EMAIL", data.email)}
        ${kv("PASSWORD", data.tempPassword)}
      </table>
      <p style="color:${BASE.textMuted};font-size:11px;margin:12px 0 0;line-height:1.5;">
        ⚠ Bitte ändere dein Passwort beim ersten Login unter Einstellungen.
      </p>
    </div>

    <!-- CTA Button -->
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:${BASE.accent};border-radius:10px;">
          <a href="${data.dashboardUrl}"
             style="display:inline-block;padding:12px 28px;color:#000;font-weight:700;font-size:14px;text-decoration:none;">
            $ vrema login --now →
          </a>
        </td>
      </tr>
    </table>

    <p style="color:${BASE.textMuted};font-size:12px;margin:24px 0 0;line-height:1.6;">
      Probleme? Schreib uns direkt: 
      <a href="mailto:kontakt@kevko.studio" style="color:${BASE.accent};text-decoration:none;">kontakt@kevko.studio</a>
    </p>`;

  return layout(`Willkommen bei Vrema – ${data.companyName}`, body);
}

// ── Password Reset ────────────────────────────────────────────────────────────
export function passwordResetEmailHtml(data: {
  recipientName: string;
  resetUrl: string;
}): string {
  const body = /* html */ `
    <h1 style="color:${BASE.textPrimary};font-size:22px;font-weight:700;margin:0 0 8px;">
      VREMA - Passwort zurücksetzen
    </h1>
    <p style="color:${BASE.textMuted};font-size:14px;margin:0 0 28px;line-height:1.6;">
      Hi <strong style="color:${BASE.textPrimary};">${data.recipientName}</strong>,<br/>
      du hast einen Passwort-Reset angefordert. Der Link ist <strong style="color:${BASE.textPrimary};">1 Stunde</strong> gültig.
    </p>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:${BASE.accent};border-radius:10px;">
          <a href="${data.resetUrl}"
             style="display:inline-block;padding:12px 28px;color:#000;font-weight:700;font-size:14px;text-decoration:none;">
            $ reset --password →
          </a>
        </td>
      </tr>
    </table>

    <p style="color:${BASE.textMuted};font-size:12px;margin:24px 0 0;line-height:1.6;">
      Falls du keinen Reset angefordert hast, ignoriere diese E-Mail.<br/>
      Dein Account ist sicher.
    </p>`;

  return layout("Passwort zurücksetzen – Vrema", body);
}

// ── Vacation approved/rejected ────────────────────────────────────────────────
export function vacationStatusEmailHtml(data: {
  recipientName: string;
  status: "APPROVED" | "REJECTED";
  startDate: string;
  endDate: string;
  days: number;
  approvedByName: string;
  decisionNote?: string;
}): string {
  const isApproved = data.status === "APPROVED";
  const statusColor = isApproved ? BASE.accent : "#ef4444";
  const statusLabel = isApproved ? "✓ Genehmigt" : "✗ Abgelehnt";

  const body = /* html */ `
    <h1 style="color:${BASE.textPrimary};font-size:22px;font-weight:700;margin:0 0 8px;">
      Urlaubsantrag <span style="color:${statusColor};">${statusLabel}</span>
    </h1>
    <p style="color:${BASE.textMuted};font-size:14px;margin:0 0 28px;line-height:1.6;">
      Hi <strong style="color:${BASE.textPrimary};">${data.recipientName}</strong>,<br/>
      dein Urlaubsantrag wurde von <strong style="color:${BASE.textPrimary};">${data.approvedByName}</strong> 
      <strong style="color:${statusColor};">${isApproved ? "genehmigt" : "abgelehnt"}</strong>.
    </p>

    <div style="background:${BASE.bg};border:1px solid ${BASE.border};border-radius:12px;padding:20px 24px;margin-bottom:28px;">
      <div style="color:${statusColor};font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;">
        # urlaubsantrag.details
      </div>
      <table cellpadding="0" cellspacing="0" width="100%">
        ${kv("von", data.startDate)}
        ${kv("bis", data.endDate)}
        ${kv("tage", data.days.toString())}
        ${kv("status", statusLabel)}
        ${kv("bearbeitet_von", data.approvedByName)}
      </table>
    </div>

    ${
      data.decisionNote
        ? `
    <div style="background:${BASE.bg};border:1px solid ${BASE.border};border-radius:12px;padding:16px 20px;margin-bottom:28px;">
      <div style="color:${statusColor};font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">
        # ${isApproved ? "anmerkung" : "begründung"}
      </div>
      <p style="color:${BASE.textPrimary};font-size:14px;margin:0;line-height:1.5;white-space:pre-wrap;">${data.decisionNote.replace(/[<>]/g, "")}</p>
    </div>`
        : ""
    }

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:${BASE.card};border:1px solid ${BASE.border};border-radius:10px;">
          <a href="${APP_URL}/dashboard/vacation"
             style="display:inline-block;padding:12px 28px;color:${BASE.textPrimary};font-weight:600;font-size:14px;text-decoration:none;">
            Alle Anträge ansehen →
          </a>
        </td>
      </tr>
    </table>`;

  return layout(`Urlaubsantrag ${isApproved ? "genehmigt" : "abgelehnt"} – Vrema`, body);
}

// ── Email verification ────────────────────────────────────────────────────────
export function verificationEmailHtml(data: {
  recipientName: string;
  verifyUrl: string;
}): string {
  const body = /* html */ `
    <h1 style="color:${BASE.textPrimary};font-size:22px;font-weight:700;margin:0 0 8px;">
      VREMA - E-Mail bestätigen
    </h1>
    <p style="color:${BASE.textMuted};font-size:14px;margin:0 0 26px;line-height:1.6;">
      Hi <strong style="color:${BASE.textPrimary};">${data.recipientName}</strong>,<br/>
      bitte bestätige deine E-Mail-Adresse, um dein Konto sicher zu aktivieren.
      Der Link ist <strong style="color:${BASE.textPrimary};">24 Stunden</strong> gültig.
    </p>

    <table cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
      <tr>
        <td style="background:${BASE.accent};border-radius:10px;">
          <a href="${data.verifyUrl}"
             style="display:inline-block;padding:12px 28px;color:#000;font-weight:700;font-size:14px;text-decoration:none;">
            $ verify --email →
          </a>
        </td>
      </tr>
    </table>

    <div style="background:${BASE.bg};border:1px solid ${BASE.border};border-radius:12px;padding:14px 16px;">
      <p style="margin:0;color:${BASE.textMuted};font-size:12px;line-height:1.6;word-break:break-all;">
        Falls der Button nicht funktioniert, nutze diesen Link:<br/>
        <a href="${data.verifyUrl}" style="color:${BASE.accent};text-decoration:none;">${data.verifyUrl}</a>
      </p>
    </div>
  `;

  return layout("VREMA - E-Mail bestätigen", body);
}

// ── No-Show / Schicht-Erinnerung ─────────────────────────────────────────────
export function noShowReminderEmailHtml(data: {
  recipientName: string;
  companyName: string;
  startTime: string;
  endTime: string;
  minutesLate: number;
  clockInUrl: string;
}): string {
  const body = /* html */ `
    <h1 style="color:${BASE.textPrimary};font-size:22px;font-weight:700;margin:0 0 8px;">
      Schicht hat begonnen
    </h1>
    <p style="color:${BASE.textMuted};font-size:14px;margin:0 0 28px;line-height:1.6;">
      Hi <strong style="color:${BASE.textPrimary};">${data.recipientName}</strong>,<br/>
      laut Plan bei <strong style="color:${BASE.textPrimary};">${data.companyName}</strong> hast du eine laufende Schicht,
      bist aber noch nicht eingestempelt.
    </p>

    <div style="background:${BASE.bg};border:1px solid #7f1d1d;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
      <div style="color:#f87171;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;">
        # schicht.status
      </div>
      <table cellpadding="0" cellspacing="0" width="100%">
        ${kv("schicht", `${data.startTime} – ${data.endTime}`)}
        ${kv("überfällig", `${data.minutesLate} Min`)}
        ${kv("aktion", "Bitte jetzt einstempeln")}
      </table>
    </div>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:${BASE.accent};border-radius:10px;">
          <a href="${data.clockInUrl}"
             style="display:inline-block;padding:12px 28px;color:#000;font-weight:700;font-size:14px;text-decoration:none;">
            $ clock-in --now →
          </a>
        </td>
      </tr>
    </table>`;

  return layout("Erinnerung: Bitte einstempeln – Vrema", body);
}

// ── Trial-Ende-Erinnerungen ───────────────────────────────────────────────────
export function trialReminderEmailHtml(data: {
  recipientName: string;
  companyName: string;
  kind: "3d" | "1d" | "expired";
  daysRemaining: number;
  trialEndsAtLabel: string;
  billingUrl: string;
  flyerCampaignLabel?: string | null;
}): string {
  const headline =
    data.kind === "expired"
      ? "Die Testphase ist vorbei"
      : data.kind === "1d"
        ? "Morgen endet deine Testphase"
        : "Noch 3 Tage Testphase";

  const intro =
    data.kind === "expired"
      ? `für <strong style="color:${BASE.textPrimary};">${data.companyName}</strong> ist die kostenlose Phase abgelaufen. Dein Team kann nicht mehr stempeln oder planen, bis du einen Tarif wählst.`
      : data.kind === "1d"
        ? `für <strong style="color:${BASE.textPrimary};">${data.companyName}</strong> läuft die Testphase <strong style="color:${BASE.textPrimary};">morgen</strong> aus. Wähle rechtzeitig einen Tarif — dann arbeitet dein Team ohne Unterbrechung weiter.`
        : `für <strong style="color:${BASE.textPrimary};">${data.companyName}</strong> bleiben noch <strong style="color:${BASE.textPrimary};">3 Tage</strong> in der Testphase. Ein Tarif jetzt sichern heißt: kein Stress am letzten Tag.`;

  const flyerNote = data.flyerCampaignLabel
    ? `<p style="color:${BASE.textMuted};font-size:12px;margin:0 0 20px;line-height:1.6;">Aktions-Zugang (${data.flyerCampaignLabel}) — danach normaler Tarif über Stripe, jederzeit kündbar.</p>`
    : "";

  const body = /* html */ `
    <h1 style="color:${BASE.textPrimary};font-size:22px;font-weight:700;margin:0 0 8px;">
      ${headline}
    </h1>
    <p style="color:${BASE.textMuted};font-size:14px;margin:0 0 20px;line-height:1.6;">
      Hi <strong style="color:${BASE.textPrimary};">${data.recipientName}</strong>,<br/>
      ${intro}
    </p>
    ${flyerNote}
    <div style="background:${BASE.bg};border:1px solid ${BASE.border};border-radius:12px;padding:20px 24px;margin-bottom:28px;">
      <div style="color:${BASE.accent};font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;">
        # trial.status
      </div>
      <table cellpadding="0" cellspacing="0" width="100%">
        ${kv("firma", data.companyName)}
        ${kv("ende", data.trialEndsAtLabel)}
        ${data.kind !== "expired" ? kv("verbleibend", `${data.daysRemaining} ${data.daysRemaining === 1 ? "Tag" : "Tage"}`) : kv("status", "abgelaufen")}
      </table>
    </div>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:${BASE.accent};border-radius:10px;">
          <a href="${data.billingUrl}"
             style="display:inline-block;padding:12px 28px;color:#000;font-weight:700;font-size:14px;text-decoration:none;">
            $ tarif wählen →
          </a>
        </td>
      </tr>
    </table>

    <p style="color:${BASE.textMuted};font-size:12px;margin:24px 0 0;line-height:1.6;">
      Fragen? <a href="mailto:kontakt@kevko.studio" style="color:${BASE.accent};text-decoration:none;">kontakt@kevko.studio</a>
    </p>`;

  return layout(headline, body);
}
