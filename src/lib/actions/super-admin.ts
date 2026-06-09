"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Prisma, type BillingInterval, type Plan } from "@prisma/client";
import { generateUniqueAffiliateCode, publicRegisterRefUrl } from "@/lib/affiliate-code";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/email/transactional";
import { stripe } from "@/lib/stripe";
import type { CompanyModuleKey } from "@/lib/company-modules";
import { flyerReferralCompanyFilters } from "@/lib/trial/referral";

function assertSuperAdmin(session: { user?: { role?: string | null; id?: string | null } } | null) {
  const allowed =
    session?.user?.role === "SUPER_ADMIN" ||
    session?.user?.id === process.env.SUPER_ADMIN_USER_ID;
  if (!allowed) {
    throw new Error("Keine Berechtigung.");
  }
}

async function generateUniqueCompanySlug(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) || "company";

  let slug = base;
  let i = 1;
  while (await db.company.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

export async function getSuperAdminOverview() {
  const session = await auth();
  assertSuperAdmin(session);

  // Performance: Statt 2N Count-Queries (N+1!) genau 3 Queries:
  //   1× Companies, 1× groupBy(userCount), 1× groupBy(activeUserCount)
  const [companies, userCounts, activeUserCounts] = await Promise.all([
    db.company.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        billingInterval: true,
        isActive: true,
        billingExempt: true,
        stripeSubId: true,
        referredBy: true,
        trialEndsAt: true,
        createdAt: true,
        industry: true,
        modulePeaks: true,
        modulePlannerWeather: true,
        moduleShiftTrade: true,
        moduleShiftTasks: true,
        moduleAutopilot: true,
      },
    }),
    db.user.groupBy({
      by: ["companyId"],
      _count: { _all: true },
    }),
    db.user.groupBy({
      by: ["companyId"],
      where: { isActive: true },
      _count: { _all: true },
    }),
  ]);

  const userCountMap = new Map(userCounts.map((u) => [u.companyId, u._count._all]));
  const activeUserCountMap = new Map(activeUserCounts.map((u) => [u.companyId, u._count._all]));

  return companies.map((c) => ({
    ...c,
    userCount: userCountMap.get(c.id) ?? 0,
    activeUserCount: activeUserCountMap.get(c.id) ?? 0,
  }));
}

export async function getSuperAdminMonitoring() {
  const session = await auth();
  assertSuperAdmin(session);

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalCompanies,
    activeCompanies,
    totalUsers,
    activeUsers,
    openWorkLogs,
    logsLast24h,
    newUsersLast7d,
    verificationTokensOpen,
    staleVerificationTokens,
    expiredSessions,
    flyerSignups,
    flyerSignupsLast7d,
  ] = await Promise.all([
    db.company.count(),
    db.company.count({ where: { isActive: true } }),
    db.user.count(),
    db.user.count({ where: { isActive: true } }),
    db.workLog.count({ where: { clockOut: null } }),
    db.workLog.count({ where: { createdAt: { gte: dayAgo } } }),
    db.user.count({ where: { createdAt: { gte: weekAgo } } }),
    db.verificationToken.count(),
    db.verificationToken.count({ where: { expires: { lt: now } } }),
    db.session.count({ where: { expires: { lt: now } } }),
    db.company.count({ where: { OR: flyerReferralCompanyFilters() } }),
    db.company.count({
      where: { OR: flyerReferralCompanyFilters(), createdAt: { gte: weekAgo } },
    }),
  ]);

  return {
    totalCompanies,
    activeCompanies,
    totalUsers,
    activeUsers,
    openWorkLogs,
    logsLast24h,
    newUsersLast7d,
    verificationTokensOpen,
    staleVerificationTokens,
    expiredSessions,
    flyerSignups,
    flyerSignupsLast7d,
    retentionCronConfigured: Boolean(process.env.DATA_RETENTION_CRON_SECRET),
    generatedAt: now.toISOString(),
  };
}

export async function updateCompanyBySuperAdmin(params: {
  companyId: string;
  plan: Plan;
  billingInterval: BillingInterval;
  isActive: boolean;
  billingExempt?: boolean;
}) {
  const session = await auth();
  assertSuperAdmin(session);

  const existing = await db.company.findUnique({
    where: { id: params.companyId },
    select: { stripeSubId: true },
  });

  if (params.billingExempt && existing?.stripeSubId) {
    try {
      await stripe.subscriptions.cancel(existing.stripeSubId);
    } catch {
      // Stripe-Sub evtl. schon gelöscht — DB trotzdem bereinigen
    }
  }

  await db.company.update({
    where: { id: params.companyId },
    data: {
      plan: params.plan,
      billingInterval: params.billingInterval,
      isActive: params.isActive,
      ...(params.billingExempt !== undefined ? { billingExempt: params.billingExempt } : {}),
      ...(params.billingExempt
        ? { stripeSubId: null, subEndsAt: null }
        : {}),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/billing");
  revalidatePath("/dashboard/partners");
}

/** Erweiterungs-Module pro Betrieb (Super-Admin, ohne Stripe). */
export async function updateCompanyModulesBySuperAdmin(params: {
  companyId: string;
  modules: Partial<Record<CompanyModuleKey, boolean>>;
}) {
  const session = await auth();
  assertSuperAdmin(session);

  const data: Record<string, boolean> = {};
  if (params.modules.peaks !== undefined) data.modulePeaks = params.modules.peaks;
  if (params.modules.plannerWeather !== undefined) data.modulePlannerWeather = params.modules.plannerWeather;
  if (params.modules.shiftTrade !== undefined) data.moduleShiftTrade = params.modules.shiftTrade;
  if (params.modules.shiftTasks !== undefined) data.moduleShiftTasks = params.modules.shiftTasks;
  if (params.modules.autopilot !== undefined) data.moduleAutopilot = params.modules.autopilot;

  if (Object.keys(data).length === 0) {
    throw new Error("Keine Modul-Änderungen.");
  }

  await db.company.update({
    where: { id: params.companyId },
    data,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard/insights");
  revalidatePath("/dashboard/peaks");
  revalidatePath("/dashboard/tasks");
}

/** Eigenen Tenant oder Kunden: Plan setzen ohne Stripe (kostenfrei). */
export async function grantCompanyPlanWithoutBilling(params: {
  companyId: string;
  plan: Plan;
  billingInterval?: BillingInterval;
}) {
  const session = await auth();
  assertSuperAdmin(session);

  await updateCompanyBySuperAdmin({
    companyId: params.companyId,
    plan: params.plan,
    billingInterval: params.billingInterval ?? "MONTHLY",
    isActive: true,
    billingExempt: true,
  });
}

export async function deleteCompanyBySuperAdmin(companyId: string) {
  const session = await auth();
  assertSuperAdmin(session);

  await db.company.delete({
    where: { id: companyId },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/partners");
}

export async function createCompanyBySuperAdmin(params: {
  companyName: string;
  ownerName: string;
  ownerEmail: string;
}) {
  const session = await auth();
  assertSuperAdmin(session);

  const companyName = params.companyName.trim();
  const ownerName = params.ownerName.trim();
  const ownerEmail = params.ownerEmail.toLowerCase().trim();

  if (!companyName || !ownerName || !ownerEmail) {
    throw new Error("Bitte alle Felder ausfüllen.");
  }

  const existingUser = await db.user.findUnique({
    where: { email: ownerEmail },
    select: { id: true },
  });
  if (existingUser) {
    throw new Error("Diese Owner-E-Mail ist bereits vergeben.");
  }

  const slug = await generateUniqueCompanySlug(companyName);
  const tempPassword = Math.random().toString(36).slice(2, 10) + "Aa1!";
  const hashed = await bcrypt.hash(tempPassword, 12);

  const company = await db.company.create({
    data: {
      name: companyName,
      slug,
      plan: "STARTER",
      billingInterval: "MONTHLY",
      isActive: true,
      billingExempt: true,
      users: {
        create: {
          name: ownerName,
          email: ownerEmail,
          password: hashed,
          role: "COMPANY_OWNER",
          emailVerified: new Date(),
          isActive: true,
        },
      },
    },
    select: { id: true, name: true, slug: true },
  });

  let welcomeEmailSent = false;
  try {
    await sendWelcomeEmail({
      recipientName: ownerName,
      recipientEmail: ownerEmail,
      companyName: company.name,
      tempPassword,
    });
    welcomeEmailSent = true;
  } catch {
    welcomeEmailSent = false;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/partners");

  return {
    company,
    ownerEmail,
    tempPassword,
    welcomeEmailSent,
  };
}

export type SuperAdminAffiliateRecentEntry = {
  id: string;
  createdAt: string;
  commissionCents: number;
  currency: string;
  status: "PENDING" | "AVAILABLE" | "PAID" | "CANCELLED";
  plan: "STARTER" | "BUSINESS" | "ENTERPRISE";
  companyName: string;
};

export type SuperAdminAffiliateSummary = {
  id: string;
  code: string;
  name: string;
  email: string | null;
  referredCompanies: number;
  pendingCents: number;
  availableCents: number;
  paidCents: number;
  recentCommissions: SuperAdminAffiliateRecentEntry[];
};

/** Anstehende Bounties (Haltefrist oder auszahlbar). */
export type SuperAdminAffiliatePayoutQueueRow = {
  id: string;
  status: "PENDING" | "AVAILABLE";
  plan: "STARTER" | "BUSINESS" | "ENTERPRISE";
  commissionCents: number;
  currency: string;
  invoiceAmountCents: number;
  stripeInvoiceId: string;
  createdAt: string;
  maturesAt: string;
  affiliate: { id: string; name: string; code: string };
  company: { id: string; name: string };
};

export async function getSuperAdminAffiliatePayoutData(): Promise<{
  affiliates: SuperAdminAffiliateSummary[];
  payoutQueue: SuperAdminAffiliatePayoutQueueRow[];
}> {
  const session = await auth();
  assertSuperAdmin(session);

  // Performance: konstant 4 Queries statt 5×N (vorher pro Affiliate 3 Aggregates
  // + 1 Count + 1 findMany). Aggregation/Top-5 erfolgt im Speicher.
  const RECENT_STATUSES = ["PENDING", "AVAILABLE", "PAID"] as const;
  const [affiliates, sumRows, companyCountRows, recentRows] = await Promise.all([
    db.affiliate.findMany({ orderBy: { name: "asc" } }),
    db.affiliateEarning.groupBy({
      by: ["affiliateId", "status"],
      where: { status: { in: [...RECENT_STATUSES] } },
      _sum: { commissionCents: true },
    }),
    db.company.groupBy({
      by: ["affiliateId"],
      where: { affiliateId: { not: null } },
      _count: { _all: true },
    }),
    db.affiliateEarning.findMany({
      where: { status: { in: [...RECENT_STATUSES] } },
      orderBy: { createdAt: "desc" },
      include: { company: { select: { name: true } } },
    }),
  ]);

  const sumsByAffiliate = new Map<string, { pending: number; available: number; paid: number }>();
  for (const row of sumRows) {
    const bucket = sumsByAffiliate.get(row.affiliateId) ?? { pending: 0, available: 0, paid: 0 };
    const cents = row._sum.commissionCents ?? 0;
    if (row.status === "PENDING") bucket.pending = cents;
    else if (row.status === "AVAILABLE") bucket.available = cents;
    else if (row.status === "PAID") bucket.paid = cents;
    sumsByAffiliate.set(row.affiliateId, bucket);
  }

  const companyCountByAffiliate = new Map<string, number>();
  for (const row of companyCountRows) {
    if (row.affiliateId) companyCountByAffiliate.set(row.affiliateId, row._count._all);
  }

  // recentRows sind bereits createdAt-absteigend; pro Affiliate die ersten 5 behalten.
  const recentByAffiliate = new Map<string, SuperAdminAffiliateRecentEntry[]>();
  for (const r of recentRows) {
    const list = recentByAffiliate.get(r.affiliateId);
    if (list && list.length >= 5) continue;
    const entry: SuperAdminAffiliateRecentEntry = {
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      commissionCents: r.commissionCents,
      currency: r.currency,
      status: r.status,
      plan: r.plan,
      companyName: r.company.name,
    };
    if (list) list.push(entry);
    else recentByAffiliate.set(r.affiliateId, [entry]);
  }

  const summaries: SuperAdminAffiliateSummary[] = affiliates.map((a) => {
    const sums = sumsByAffiliate.get(a.id);
    return {
      id: a.id,
      code: a.code,
      name: a.name,
      email: a.email,
      referredCompanies: companyCountByAffiliate.get(a.id) ?? 0,
      pendingCents: sums?.pending ?? 0,
      availableCents: sums?.available ?? 0,
      paidCents: sums?.paid ?? 0,
      recentCommissions: recentByAffiliate.get(a.id) ?? [],
    };
  });

  const queueRaw = await db.affiliateEarning.findMany({
    where: { status: { in: ["PENDING", "AVAILABLE"] } },
    include: {
      affiliate: { select: { id: true, name: true, code: true } },
      company: { select: { id: true, name: true } },
    },
  });

  const payoutQueue: SuperAdminAffiliatePayoutQueueRow[] = [...queueRaw]
    .sort((a, b) => {
      if (a.status === "AVAILABLE" && b.status !== "AVAILABLE") return -1;
      if (a.status !== "AVAILABLE" && b.status === "AVAILABLE") return 1;
      return new Date(a.maturesAt).getTime() - new Date(b.maturesAt).getTime();
    })
    .map((e) => ({
      id: e.id,
      status: e.status as "PENDING" | "AVAILABLE",
      plan: e.plan,
      commissionCents: e.commissionCents,
      currency: e.currency,
      invoiceAmountCents: e.invoiceAmountCents,
      stripeInvoiceId: e.stripeInvoiceId,
      createdAt: e.createdAt.toISOString(),
      maturesAt: e.maturesAt.toISOString(),
      affiliate: e.affiliate,
      company: e.company,
    }));

  return { affiliates: summaries, payoutQueue };
}

export async function markAffiliateEarningsPaid(earningIds: string[]) {
  const session = await auth();
  assertSuperAdmin(session);

  if (earningIds.length === 0) {
    throw new Error("Keine Zeilen ausgewählt.");
  }

  const rows = await db.affiliateEarning.findMany({
    where: { id: { in: earningIds } },
    select: { id: true, status: true },
  });
  if (rows.length !== earningIds.length) {
    throw new Error("Mindestens eine ID ist ungültig.");
  }
  if (rows.some((r) => r.status !== "AVAILABLE")) {
    throw new Error("Nur Einträge mit Status „auszahlbar“ können markiert werden.");
  }

  const now = new Date();
  await db.affiliateEarning.updateMany({
    where: {
      id: { in: earningIds },
      status: "AVAILABLE",
    },
    data: {
      status: "PAID",
      paidAt: now,
    },
  });

  revalidatePath("/dashboard/partners");
}

export async function createAffiliateForSuperAdmin(params: {
  name: string;
  email?: string | null;
}): Promise<{ code: string; refUrl: string; tempPassword: string }> {
  const session = await auth();
  assertSuperAdmin(session);

  const name = params.name.trim();
  const email = params.email?.trim().toLowerCase() ?? "";
  if (!name) {
    throw new Error("Name ist erforderlich.");
  }
  if (!email) {
    throw new Error("E-Mail ist erforderlich, damit der Partner sich einloggen kann.");
  }

  const code = await generateUniqueAffiliateCode(name);
  const tempPassword = Math.random().toString(36).slice(2, 10) + "Aa1!";
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  try {
    await db.$executeRaw`
      INSERT INTO "Affiliate" ("id","code","name","email","passwordHash","isActive","createdAt","updatedAt")
      VALUES (${randomUUID()}, ${code}, ${name}, ${email}, ${passwordHash}, ${true}, NOW(), NOW())
    `;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("Code oder E-Mail bereits vorhanden.");
    }
    throw e;
  }

  revalidatePath("/dashboard/partners");

  return { code, refUrl: publicRegisterRefUrl(code), tempPassword };
}
