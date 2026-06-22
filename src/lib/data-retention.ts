import type { PrismaClient } from "@prisma/client";

type RetentionConfig = {
  unverifiedUserDays: number;
  emptyCompanyDays: number;
  workLogDays: number;
  vacationDays: number;
};

export type DataRetentionReport = {
  deletedExpiredSessions: number;
  deletedExpiredVerificationTokens: number;
  deletedUnverifiedUsers: number;
  deletedEmptyCompanies: number;
  deletedOldWorkLogs: number;
  deletedOldVacationRequests: number;
  purgedExpiredSickAttachments: number;
  config: RetentionConfig;
  executedAt: string;
};

function parseDays(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0) return 0;
  return Math.floor(parsed);
}

function minusDays(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export function resolveRetentionConfig(): RetentionConfig {
  return {
    unverifiedUserDays: parseDays(process.env.DATA_RETENTION_UNVERIFIED_USER_DAYS, 14),
    emptyCompanyDays: parseDays(process.env.DATA_RETENTION_EMPTY_COMPANY_DAYS, 30),
    workLogDays: parseDays(process.env.DATA_RETENTION_WORKLOG_DAYS, 0),
    vacationDays: parseDays(process.env.DATA_RETENTION_VACATION_DAYS, 0),
  };
}

export async function runDataRetention(prisma: PrismaClient): Promise<DataRetentionReport> {
  const config = resolveRetentionConfig();
  const now = new Date();

  const [expiredSessions, expiredTokens] = await prisma.$transaction([
    prisma.session.deleteMany({
      where: { expires: { lt: now } },
    }),
    prisma.verificationToken.deleteMany({
      where: { expires: { lt: now } },
    }),
  ]);

  const staleUserCutoff = minusDays(config.unverifiedUserDays);
  const staleCompanyCutoff = minusDays(config.emptyCompanyDays);

  const [unverifiedUsers, emptyCompanies] = await prisma.$transaction([
    prisma.user.deleteMany({
      where: {
        role: { not: "SUPER_ADMIN" },
        emailVerified: null,
        createdAt: { lt: staleUserCutoff },
        sessions: { none: {} },
      },
    }),
    prisma.company.deleteMany({
      where: {
        createdAt: { lt: staleCompanyCutoff },
        users: { none: {} },
      },
    }),
  ]);

  // System-Retention-Job: läuft über alle Tenants. Damit wir auch im Audit
  // pro Firma sehen, was gelöscht wurde – und damit ein versehentlicher
  // globaler `DATA_RETENTION_WORKLOG_DAYS=1` nicht unbemerkt ALLES wegrasiert –
  // iterieren wir explizit pro `companyId`. Jeder einzelne `deleteMany`
  // hat damit `companyId` im Where (RLS-Prinzip).
  let deletedOldWorkLogs = 0;
  if (config.workLogDays > 0) {
    const oldWorkLogCutoff = minusDays(config.workLogDays);
    const companies = await prisma.company.findMany({
      select: { id: true },
      where: { isActive: true },
    });
    for (const c of companies) {
      const deleted = await prisma.workLog.deleteMany({
        where: { companyId: c.id, clockIn: { lt: oldWorkLogCutoff } },
      });
      deletedOldWorkLogs += deleted.count;
    }
  }

  let deletedOldVacationRequests = 0;
  if (config.vacationDays > 0) {
    const oldVacationCutoff = minusDays(config.vacationDays);
    const companies = await prisma.company.findMany({
      select: { id: true },
      where: { isActive: true },
    });
    for (const c of companies) {
      const deleted = await prisma.vacationRequest.deleteMany({
        where: { companyId: c.id, endDate: { lt: oldVacationCutoff } },
      });
      deletedOldVacationRequests += deleted.count;
    }
  }

  /** AU-Anhänge: nach `sickAttachmentRetainUntil` Rohdaten entfernen (Art. 5 / Art. 9). */
  let purgedExpiredSickAttachments = 0;
  const companiesForSick = await prisma.company.findMany({
    select: { id: true },
    where: { isActive: true },
  });
  for (const c of companiesForSick) {
    const purged = await prisma.vacationRequest.updateMany({
      where: {
        companyId: c.id,
        sickAttachmentRetainUntil: { lt: now },
        sickAttachmentData: { not: null },
      },
      data: {
        sickAttachmentMime: null,
        sickAttachmentData: null,
        sickAttachmentUploadedAt: null,
        sickAttachmentRetainUntil: null,
      },
    });
    purgedExpiredSickAttachments += purged.count;
  }

  return {
    deletedExpiredSessions: expiredSessions.count,
    deletedExpiredVerificationTokens: expiredTokens.count,
    deletedUnverifiedUsers: unverifiedUsers.count,
    deletedEmptyCompanies: emptyCompanies.count,
    deletedOldWorkLogs,
    deletedOldVacationRequests,
    purgedExpiredSickAttachments,
    config,
    executedAt: now.toISOString(),
  };
}
