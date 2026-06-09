import { db } from "@/lib/db";
import { sendTrialReminderEmail } from "@/lib/email/transactional";
import { flyerReferralDisplayName, isFlyerReferralCode } from "@/lib/trial/referral";
import {
  pendingTrialReminder,
  trialInAppNotification,
  type TrialReminderCompany,
  type TrialReminderKind,
} from "@/lib/trial/reminders";
import { createNotificationsForUsers } from "@/lib/notifications/create";
import { trialDaysRemaining } from "@/lib/trial";

export type TrialReminderReport = {
  scanned: number;
  sent: number;
  skipped: number;
  errors: number;
  executedAt: string;
};

function sentAtField(kind: TrialReminderKind): keyof Pick<
  TrialReminderCompany,
  "trialRemind3dSentAt" | "trialRemind1dSentAt" | "trialExpiredNotifiedAt"
> {
  switch (kind) {
    case "3d":
      return "trialRemind3dSentAt";
    case "1d":
      return "trialRemind1dSentAt";
    case "expired":
      return "trialExpiredNotifiedAt";
  }
}

export async function runTrialReminders(): Promise<TrialReminderReport> {
  const now = new Date();
  const report: TrialReminderReport = {
    scanned: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
    executedAt: now.toISOString(),
  };

  const companies = await db.company.findMany({
    where: {
      billingExempt: false,
      stripeSubId: null,
      trialEndsAt: { not: null },
    },
    select: {
      id: true,
      name: true,
      referredBy: true,
      trialEndsAt: true,
      stripeSubId: true,
      subEndsAt: true,
      billingExempt: true,
      trialRemind3dSentAt: true,
      trialRemind1dSentAt: true,
      trialExpiredNotifiedAt: true,
    },
  });

  for (const company of companies) {
    report.scanned += 1;
    const kind = pendingTrialReminder(company);
    if (!kind) {
      report.skipped += 1;
      continue;
    }

    const owners = await db.user.findMany({
      where: {
        companyId: company.id,
        isActive: true,
        role: { in: ["COMPANY_OWNER", "MANAGER"] },
      },
      select: { id: true, name: true, email: true },
    });

    if (owners.length === 0) {
      report.skipped += 1;
      continue;
    }

    const flyerLabel =
      company.referredBy && isFlyerReferralCode(company.referredBy)
        ? flyerReferralDisplayName(company.referredBy)
        : null;

    try {
      const daysRemaining = trialDaysRemaining(company);
      const inApp = trialInAppNotification(kind, daysRemaining);
      const ownerIds = owners.map((o) => o.id);

      await db.company.update({
        where: { id: company.id },
        data: { [sentAtField(kind)]: now },
      });

      await Promise.all([
        createNotificationsForUsers({
          companyId: company.id,
          userIds: ownerIds,
          type: "GENERIC",
          title: inApp.title,
          body: inApp.body,
          href: inApp.href,
        }),
        ...owners.map((owner) =>
          sendTrialReminderEmail({
            kind,
            recipientName: owner.name ?? "VREMA Nutzer",
            recipientEmail: owner.email,
            companyName: company.name,
            daysRemaining,
            trialEndsAt: company.trialEndsAt!,
            flyerCampaignLabel: flyerLabel,
          }),
        ),
      ]);

      report.sent += 1;
    } catch (err) {
      console.error("[trial-reminders] failed for company", company.id, err);
      report.errors += 1;
    }
  }

  return report;
}
