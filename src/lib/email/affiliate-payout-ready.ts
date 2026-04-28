import { Resend } from "resend";

const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@vrema.app";

export type AffiliateMaturedLine = {
  partnerName: string;
  partnerCode: string;
  maturedTotalCents: number;
};

function formatEur(cents: number) {
  return (cents / 100).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Benachrichtigt die Plattform-Admins, wenn Buchungen von PENDING → AVAILABLE reifen.
 * Nutzt AFFILIATE_ADMIN_NOTIFY_EMAIL (kommagetrennt möglich). Ohne Empfänger: no-op.
 */
export async function sendAffiliatePayoutReadyAdminEmail(lines: AffiliateMaturedLine[]) {
  if (lines.length === 0) return;

  const raw = process.env.AFFILIATE_ADMIN_NOTIFY_EMAIL?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[affiliate] AFFILIATE_ADMIN_NOTIFY_EMAIL nicht gesetzt – keine Auszahlungs-Benachrichtigung.",
      );
    }
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[affiliate] RESEND_API_KEY fehlt – Auszahlungs-Benachrichtigung übersprungen.");
    return;
  }

  const resend = new Resend(apiKey);
  const recipients = raw
    .split(/[;,]/g)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const unique = Array.from(new Set(recipients));
  if (unique.length === 0) return;

  const rows = lines
    .map(
      (l) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">${escapeHtml(l.partnerName)}</td>` +
        `<td style="padding:8px 12px;border-bottom:1px solid #eee;font-family:monospace;font-size:13px">${escapeHtml(l.partnerCode)}</td>` +
        `<td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right"><strong>${formatEur(l.maturedTotalCents)} €</strong></td></tr>`,
    )
    .join("");

  const html = `
  <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111">
    <h2 style="font-size:18px;margin:0 0 12px">Vrema · Affiliate: Auszahlung bereit</h2>
    <p style="font-size:14px;color:#444;margin:0 0 16px">
      Nach der Haltefrist sind neue Beträge <strong>auszahlbar</strong> (Status AVAILABLE).
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="background:#f6f6f6">
          <th align="left" style="padding:8px 12px">Partner</th>
          <th align="left" style="padding:8px 12px">Code</th>
          <th align="right" style="padding:8px 12px">Neu auszahlbar</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:12px;color:#888;margin:20px 0 0">Super-Admin → Affiliate &amp; Auszahlungen</p>
  </div>`;

  const { error } = await resend.emails.send({
    from: FROM,
    to: unique,
    subject:
      lines.length === 1
        ? `Affiliate: Auszahlung für ${lines[0].partnerName} bereit`
        : `Affiliate: ${lines.length} Partner mit neu auszahlbarem Guthaben`,
    html,
  });

  if (error) {
    console.error("[affiliate] Resend notify failed:", error);
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
