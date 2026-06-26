import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications/create";

const DEFAULT_OPERATOR_EMAIL = "kontakt@kevko.studio";

/** E-Mail-Adressen für Betreiber-Benachrichtigungen (Flyer-Signups, Trial-Ende). */
export function getOperatorNotifyEmails(): string[] {
  const raw =
    process.env.OPERATOR_NOTIFY_EMAIL?.trim() ||
    process.env.AFFILIATE_ADMIN_NOTIFY_EMAIL?.trim() ||
    DEFAULT_OPERATOR_EMAIL;
  return raw
    .split(/[;,]/g)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function getSuperAdminContext(): Promise<{ userId: string; companyId: string } | null> {
  const id = process.env.SUPER_ADMIN_USER_ID?.trim();
  if (!id) return null;
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, companyId: true },
  });
  if (!user?.companyId) return null;
  return { userId: user.id, companyId: user.companyId };
}

/** In-App-Hinweis für Kevin auf dem Start-Dashboard bei neuem Flyer-Signup. */
export async function notifySuperAdminFlyerSignup(params: {
  companyName: string;
  ownerEmail: string;
  refCode: string;
  campaignLabel: string;
}) {
  const admin = await getSuperAdminContext();
  if (!admin) return;
  await createNotification({
    companyId: admin.companyId,
    userId: admin.userId,
    type: "GENERIC",
    title: `Neuer Flyer-Signup: ${params.companyName}`,
    body: `${params.campaignLabel} · ${params.ownerEmail} — im Super-Admin freischalten.`,
    href: "/dashboard",
  });
}
