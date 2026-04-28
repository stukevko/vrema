import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { ReportsClient } from "@/components/dashboard/ReportsClient";
import { VacationStatus } from "@prisma/client";
import { getWeekCycleIndex } from "@/lib/shift-cycle";
import { sumWorkedMinutes } from "@/lib/time/payroll";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/auth/login");

  const { companyId, id: userId } = session.user as { companyId: string; id: string };
  const plan = session.user.plan ?? "STARTER";
  const role = session.user.role ?? "EMPLOYEE";
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { name: true, shiftCycleWeeks: true },
  });
  const companyName = company?.name ?? "Vrema";

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);

  // Managers see all; employees see own
  const isManager = ["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role);

  const logs = await db.workLog.findMany({
    where: tenantWhere(companyId, {
      ...(isManager ? {} : { userId }),
      clockIn: { gte: start, lte: end },
    }),
    include: { user: { select: { id: true, name: true, email: true, employeeNumber: true, weeklyHours: true } } },
    orderBy: { clockIn: "desc" },
  });

  const userIds = Array.from(new Set(logs.map((l) => l.user.id)));

  const [monthShifts, absences] = await Promise.all([
    db.shift.findMany({
      where: tenantWhere(companyId, { userId: { in: userIds } }),
      select: { userId: true, weekIndex: true, dayOfWeek: true, startTime: true, endTime: true },
    }),
    db.vacationRequest.findMany({
      where: tenantWhere(companyId, {
        status: VacationStatus.APPROVED,
        endDate: { gte: start },
        startDate: { lte: end },
        userId: { in: userIds },
      }),
      select: { userId: true, startDate: true, endDate: true, absenceType: true },
    }),
  ]);

  const monthlySollMinutesByUser: Record<string, number> = {};
  const dayCountsByWeekdayAndWeek = new Map<string, number>();
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
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
      const key = `${s.weekIndex}-${s.dayOfWeek}`;
      return sum + mins * (dayCountsByWeekdayAndWeek.get(key) ?? 0);
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
    },
  });

  // Total stats
  const totalMinutes = sumWorkedMinutes(logs);

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
        latitude: l.latitude,
        longitude: l.longitude,
        isOutOfRange: l.isOutOfRange,
      }))}
      totalMinutes={totalMinutes}
      month={`${now.toLocaleString("de-DE", { month: "long" })} ${year}`}
      plan={plan}
      isManager={isManager}
      companyName={companyName}
      monthlySollMinutesByUser={monthlySollMinutesByUser}
      absences={normalizedAbsences}
      correctionRequests={correctionRequests.map((r) => ({
        id: r.id,
        workLogId: r.workLogId,
        userId: r.userId,
        userName: r.user.name ?? r.user.email,
        requestedClockIn: r.requestedClockIn.toISOString(),
        requestedClockOut: r.requestedClockOut?.toISOString() ?? null,
        requestedBreakMins: r.requestedBreakMins,
        requestedNote: r.requestedNote,
        reason: r.reason,
        status: r.status as "PENDING" | "APPROVED" | "REJECTED",
        reviewerName: r.reviewedBy?.name ?? r.reviewedBy?.email ?? null,
      }))}
    />
  );
}
