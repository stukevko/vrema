import "server-only";

import { ShiftTradeStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { companyModulesFromRow, type CompanyModules } from "@/lib/company-modules";
import { evaluateShiftTradeProposal } from "@/lib/planning/intelligence";
import { getUnavailableDaysForCompany } from "@/lib/actions/work-schedule";
import { getVacationConflictDaysForCompany } from "@/lib/actions/vacation";
import { getShiftTemplatesForCompany } from "@/lib/actions/shift-templates";
import { assignMissingEmployeeNumbersForCompany } from "@/lib/team/allocate-employee-number";
import { isOpenShiftPlaceholderEmail } from "@/lib/planning/open-shift-placeholder";
import { tenantWhere } from "@/lib/tenant-guard";
import { normalizeCycleWeeks, type ShiftCycleWeeks } from "@/lib/shift-cycle";
import { logServerError } from "@/lib/server-logger";

const MODULE_SELECT = {
  industry: true,
  modulePeaks: true,
  modulePlannerWeather: true,
  moduleShiftTrade: true,
  moduleShiftTasks: true,
  moduleAutopilot: true,
} as const;

const DEFAULT_MODULES: CompanyModules = {
  peaks: false,
  plannerWeather: false,
  shiftTrade: true,
  shiftTasks: false,
  autopilot: false,
};

const TEAM_MEMBER_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  isActive: true,
  weeklyHours: true,
  vacationDays: true,
  employeeNumber: true,
  hourlyWage: true,
  planningWorkArea: true,
  createdAt: true,
} as const;

const SHIFT_SELECT = {
  id: true,
  userId: true,
  weekIndex: true,
  dayOfWeek: true,
  startTime: true,
  endTime: true,
  breakDuration: true,
  isDraft: true,
  staffingRole: true,
  isOpenForTrade: true,
  tradeStatus: true,
  tradeRequestedBy: true,
} as const;

export type PlanningManagerPageData = {
  companyName: string;
  members: Awaited<ReturnType<typeof loadPlanningTeamMembers>>;
  shifts: Awaited<ReturnType<typeof loadPlanningShifts>>;
  vacationConflictDays: Awaited<ReturnType<typeof getVacationConflictDaysForCompany>>;
  shiftCycleWeeks: ShiftCycleWeeks;
  pendingTrades: Awaited<ReturnType<typeof loadPlanningPendingTrades>>;
  shiftTemplates: Awaited<ReturnType<typeof getShiftTemplatesForCompany>>;
  companyModules: CompanyModules;
  unavailableDaysByUserId: Record<string, number[]>;
  openShifts: Awaited<ReturnType<typeof loadPlanningOpenShifts>>;
  loadErrors: string[];
};

export async function loadPlanningTeamMembers(companyId: string) {
  return db.user.findMany({
    where: tenantWhere(companyId, {
      email: { not: { endsWith: "@vrema.local" } },
    }),
    select: TEAM_MEMBER_SELECT,
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

export async function loadPlanningShifts(companyId: string) {
  return db.shift.findMany({
    where: tenantWhere(companyId),
    select: SHIFT_SELECT,
    orderBy: [{ userId: "asc" }, { weekIndex: "asc" }, { dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

export async function loadPlanningShiftCycleWeeks(companyId: string): Promise<ShiftCycleWeeks> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { shiftCycleWeeks: true },
  });
  return normalizeCycleWeeks(company?.shiftCycleWeeks);
}

export async function loadPlanningCompanyName(companyId: string): Promise<string> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  });
  return company?.name?.trim() ?? "";
}

export async function loadPlanningCompanyModules(companyId: string): Promise<CompanyModules> {
  try {
    const row = await db.company.findUnique({
      where: { id: companyId },
      select: MODULE_SELECT,
    });
    if (!row) return DEFAULT_MODULES;
    return companyModulesFromRow(row);
  } catch (err) {
    logServerError("planning.loadCompanyModules", err, { companyId });
    return DEFAULT_MODULES;
  }
}

export async function loadPlanningPendingTrades(companyId: string) {
  const rows = await db.shift.findMany({
    where: tenantWhere(companyId, { tradeStatus: ShiftTradeStatus.PENDING_APPROVAL, isDraft: false }),
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  // Statt der kompletten Firmen-User-Liste pro Trade: nur die tatsächlich
  // referenzierten Antragsteller in EINER Query nachladen (kein N×Full-Fetch).
  const requesterIds = [...new Set(rows.map((r) => r.tradeRequestedBy).filter((id): id is string => Boolean(id)))];
  const requesters =
    requesterIds.length > 0
      ? await db.user.findMany({
          where: tenantWhere(companyId, { id: { in: requesterIds } }),
          select: { id: true, name: true, email: true },
        })
      : [];
  const requesterById = new Map(requesters.map((u) => [u.id, u]));

  const base = rows.map((row) => {
    const requester = row.tradeRequestedBy ? requesterById.get(row.tradeRequestedBy) : undefined;
    return {
      id: row.id,
      dayOfWeek: row.dayOfWeek,
      startTime: row.startTime,
      endTime: row.endTime,
      fromName: row.user.name ?? row.user.email,
      requestedByName: requester?.name ?? requester?.email ?? "Unbekannt",
      requestedById: row.tradeRequestedBy,
      userId: row.userId,
    };
  });

  const intelList = await Promise.all(
    base.map((b) =>
      evaluateShiftTradeProposal(companyId, b.id).catch((err) => {
        logServerError("planning.tradeIntel", err, { shiftId: b.id });
        return null;
      }),
    ),
  );

  return base.map((b, i) => ({ ...b, intel: intelList[i] ?? null }));
}

export async function loadPlanningOpenShifts(companyId: string) {
  const rows = await db.shift.findMany({
    where: tenantWhere(companyId, {
      isDraft: false,
      OR: [
        { tradeStatus: ShiftTradeStatus.OPEN, isOpenForTrade: true },
        { tradeStatus: ShiftTradeStatus.PENDING_APPROVAL },
      ],
    }),
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    take: 30,
  });

  const requesterIds = rows.map((r) => r.tradeRequestedBy).filter((id): id is string => Boolean(id));
  const requesters =
    requesterIds.length > 0
      ? await db.user.findMany({
          where: tenantWhere(companyId, { id: { in: requesterIds } }),
          select: { id: true, name: true, email: true },
        })
      : [];
  const requesterById = new Map(requesters.map((u) => [u.id, u]));

  return rows.map((s) => {
    const requester = s.tradeRequestedBy ? requesterById.get(s.tradeRequestedBy) : null;
    const ownerName = isOpenShiftPlaceholderEmail(s.user.email)
      ? "Offene Lücke"
      : (s.user.name ?? s.user.email);
    return {
      id: s.id,
      ownerName,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      tradeStatus: s.tradeStatus,
      pendingRequesterName: requester ? (requester.name ?? requester.email) : null,
    };
  });
}

/** Planer-Daten ohne requireTenant/revalidatePath — sicher für RSC-Render. */
export async function loadPlanningManagerPageData(
  companyId: string,
  role: string,
): Promise<PlanningManagerPageData> {
  const loadErrors: string[] = [];

  try {
    await assignMissingEmployeeNumbersForCompany(companyId);
  } catch (err) {
    logServerError("planning.assignEmployeeNumbers", err, { companyId });
  }

  const settled = await Promise.allSettled([
    loadPlanningTeamMembers(companyId),
    loadPlanningShifts(companyId),
    getVacationConflictDaysForCompany(companyId),
    loadPlanningShiftCycleWeeks(companyId),
    loadPlanningPendingTrades(companyId),
    getShiftTemplatesForCompany(companyId, role),
    loadPlanningCompanyName(companyId),
  ]);

  const labels = [
    "members",
    "shifts",
    "vacationConflicts",
    "cycleWeeks",
    "pendingTrades",
    "templates",
    "companyName",
  ];
  settled.forEach((r, i) => {
    if (r.status === "rejected") {
      logServerError(`planning.page.${labels[i]}`, r.reason, { companyId });
      loadErrors.push(labels[i]!);
    }
  });

  const members = settled[0].status === "fulfilled" ? settled[0].value : [];
  const shifts = settled[1].status === "fulfilled" ? settled[1].value : [];
  const vacationConflictDays = settled[2].status === "fulfilled" ? settled[2].value : [];
  const shiftCycleWeeksRaw = settled[3].status === "fulfilled" ? settled[3].value : 1;
  const shiftCycleWeeks = normalizeCycleWeeks(shiftCycleWeeksRaw);
  const pendingTrades = settled[4].status === "fulfilled" ? settled[4].value : [];
  const shiftTemplates = settled[5].status === "fulfilled" ? settled[5].value : [];
  const companyName = settled[6].status === "fulfilled" ? settled[6].value : "";
  const companyModules = await loadPlanningCompanyModules(companyId);

  let openShifts: Awaited<ReturnType<typeof loadPlanningOpenShifts>> = [];
  if (companyModules.shiftTrade) {
    try {
      openShifts = await loadPlanningOpenShifts(companyId);
    } catch (err) {
      logServerError("planning.page.openShifts", err, { companyId });
      loadErrors.push("openShifts");
    }
  }

  let unavailableDaysByUserId: Record<string, number[]> = {};
  try {
    const unavailableMap = await getUnavailableDaysForCompany(
      companyId,
      members.map((m) => m.id),
    );
    unavailableDaysByUserId = Object.fromEntries(
      [...unavailableMap.entries()].map(([userId, days]) => [userId, [...days]]),
    );
  } catch (err) {
    logServerError("planning.page.unavailableDays", err, { companyId });
    loadErrors.push("unavailableDays");
  }

  return {
    companyName,
    members,
    shifts,
    vacationConflictDays,
    shiftCycleWeeks,
    pendingTrades,
    shiftTemplates,
    companyModules,
    unavailableDaysByUserId,
    openShifts,
    loadErrors,
  };
}
