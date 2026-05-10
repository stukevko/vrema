import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { ReportsClient } from "@/components/dashboard/ReportsClient";
import { VacationStatus } from "@prisma/client";
import { getWeekCycleIndex } from "@/lib/shift-cycle";
import { sumWorkedMinutes } from "@/lib/time/payroll";
import { getMonthBoundsUtc } from "@/lib/time/timezone";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: { month?: string };
}) {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/auth/login");

  const { companyId, id: userId } = session.user as { companyId: string; id: string };
  const role = session.user.role ?? "EMPLOYEE";
  if (role === "EMPLOYEE") {
    redirect("/dashboard");
  }

  const plan = session.user.plan ?? "STARTER";
  const canDatevExport = role === "COMPANY_OWNER" || role === "SUPER_ADMIN";
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { name: true, shiftCycleWeeks: true },
  });
  const companyName = company?.name ?? "";

  const now = new Date();
  const monthParam = searchParams?.month;
  const monthMatch = monthParam?.match(/^(\d{4})-(\d{2})$/);
  const year = monthMatch ? Number.parseInt(monthMatch[1], 10) : now.getFullYear();
  const month = monthMatch ? Number.parseInt(monthMatch[2], 10) - 1 : now.getMonth(); // 0-based

  const { start, endExclusive } = getMonthBoundsUtc(year, month + 1, "Europe/Berlin");

  // Managers see all; employees see own
  const isManager = ["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role);

  const logs = await db.workLog.findMany({
    where: tenantWhere(companyId, {
      ...(isManager ? {} : { userId }),
      clockIn: { gte: start, lt: endExclusive },
    }),
    include: { user: { select: { id: true, name: true, email: true, employeeNumber: true, weeklyHours: true } } },
    orderBy: { clockIn: "desc" },
    take: 25_000,
  });

  const userIds = Array.from(new Set(logs.map((l) => l.user.id)));

  const monthKeyDb = `${year}-${String(month + 1).padStart(2, "0")}`;

  const wageWhere =
    isManager && userIds.length > 0
      ? { id: { in: userIds } }
      : !isManager
        ? { id: userId }
        : {};

  const shiftAndAbsenceUserFilter =
    userIds.length > 0
      ? { userId: { in: userIds } }
      : isManager
        ? { userId: { in: [] as string[] } }
        : { userId };

  const [monthShifts, absences, timesheetAcks, wageRows] = await Promise.all([
    db.shift.findMany({
      where: tenantWhere(companyId, shiftAndAbsenceUserFilter),
      select: { userId: true, weekIndex: true, dayOfWeek: true, startTime: true, endTime: true, breakDuration: true },
    }),
    db.vacationRequest.findMany({
      where: tenantWhere(companyId, {
        status: VacationStatus.APPROVED,
        endDate: { gte: start },
        startDate: { lt: endExclusive },
        ...shiftAndAbsenceUserFilter,
      }),
      select: { userId: true, startDate: true, endDate: true, absenceType: true },
    }),
    db.timesheetAcknowledgment.findMany({
      where: tenantWhere(companyId, { monthKey: monthKeyDb }),
      select: { userId: true, confirmedAt: true },
    }),
    Object.keys(wageWhere).length > 0
      ? db.user.findMany({
          where: tenantWhere(companyId, wageWhere),
          select: { id: true, hourlyWage: true },
        })
      : Promise.resolve([] as Array<{ id: string; hourlyWage: number | null }>),
  ]);

  const monthlySollMinutesByUser: Record<string, number> = {};
  const dayCountsByWeekdayAndWeek = new Map<string, number>();
  const loopEnd = new Date(endExclusive.getTime() - 1);
  for (let d = new Date(start); d <= loopEnd; d.setDate(d.getDate() + 1)) {
    const wd = d.getDay();
    const weekIndex = getWeekCycleIndex(new Date(d), company?.shiftCycleWeeks);
    const key = `${weekIndex}-${wd}`;
    dayCountsByWeekdayAndWeek.set(key, (dayCountsByWeekdayAndWeek.get(key) ?? 0) + 1);
  }
  for (const userId of userIds) {
    const userShifts = monthShifts.filter((s) => s.userId === userId);
    const total = userShifts.reduce((sum, s) => {
      const [sh, sm] = s.startTime.split(":").map(Number);
      const [eh, em] = s.endTime.split(":").map(Number);
      if ([sh, sm, eh, em].some(Number.isNaN)) return sum;
      const mins = eh * 60 + em - (sh * 60 + sm);
      if (mins <= 0) return sum;
      const netMins = Math.max(0, mins - (s.breakDuration ?? 0));
      const key = `${s.weekIndex}-${s.dayOfWeek}`;
      return sum + netMins * (dayCountsByWeekdayAndWeek.get(key) ?? 0);
    }, 0);
    monthlySollMinutesByUser[userId] = total;
  }

  const normalizedAbsences = absences.map((a) => {
    const type: "VACATION" | "SICK" = a.absenceType === "SICK" ? "SICK" : "VACATION";
    return {
      userId: a.userId,
      startDate: a.startDate.toISOString(),
      endDate: a.endDate.toISOString(),
      type,
    };
  });

  const correctionRequests = await db.workLogCorrectionRequest.findMany({
    where: tenantWhere(companyId, isManager ? {} : { userId }),
    orderBy: { createdAt: "desc" },
    take: isManager ? 40 : 20,
    include: {
      user: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
      workLog: { select: { clockIn: true, clockOut: true, breakMins: true } },
    },
  });

  // Total stats
  const totalMinutes = sumWorkedMinutes(logs);

  const hourlyWageByUserId: Record<string, number | null> = Object.fromEntries(
    wageRows.map((w) => [w.id, w.hourlyWage])
  );
  const timesheetAcknowledgedAtByUserId: Record<string, string> = Object.fromEntries(
    timesheetAcks.map((a) => [a.userId, a.confirmedAt.toISOString()])
  );

  return (
    <ReportsClient
      logs={logs.map((l) => ({
        id: l.id,
        userName: l.user.name ?? l.user.email,
        userId: l.user.id,
        employeeNumber: l.user.employeeNumber ?? "",
        weeklyHours: l.user.weeklyHours,
        clockIn: l.clockIn.toISOString(),
        clockOut: l.clockOut?.toISOString() ?? null,
        breakMins: l.breakMins,
        status: l.status,
        note: l.note,
      }))}
      totalMinutes={totalMinutes}
      month={`${start.toLocaleString("de-DE", { month: "long", timeZone: "Europe/Berlin" })} ${year}`}
      monthKey={`${year}-${String(month + 1).padStart(2, "0")}`}
      plan={plan}
      isManager={isManager}
      canDatevExport={canDatevExport}
      companyName={companyName}
      monthlySollMinutesByUser={monthlySollMinutesByUser}
      absences={normalizedAbsences}
      correctionRequests={correctionRequests.map((r) => ({
        id: r.id,
        workLogId: r.workLogId,
        userId: r.userId,
        userName: r.user.name ?? r.user.email,
        originalClockIn: r.workLog?.clockIn.toISOString() ?? null,
        originalClockOut: r.workLog?.clockOut?.toISOString() ?? null,
        originalBreakMins: r.workLog ? r.workLog.breakMins : null,
        requestedClockIn: r.requestedClockIn.toISOString(),
        requestedClockOut: r.requestedClockOut?.toISOString() ?? null,
        requestedBreakMins: r.requestedBreakMins,
        requestedNote: r.requestedNote,
        reason: r.reason,
        status: r.status as "PENDING" | "APPROVED" | "REJECTED",
        reviewerName: r.reviewedBy?.name ?? r.reviewedBy?.email ?? null,
        reviewerNote: r.reviewerNote ?? null,
      }))}
      currentUserId={userId}
      hourlyWageByUserId={hourlyWageByUserId}
      timesheetAcknowledgedAtByUserId={timesheetAcknowledgedAtByUserId}
    />
  );
}
