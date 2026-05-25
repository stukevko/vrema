"use server";

import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import {
  assertDraftsPublishable,
  generateOptimalSchedule,
  type AutopilotOptions,
} from "@/lib/planning/autopilot";
import type { ShiftPlanRow } from "@/lib/planning/compliance";
import { createNotificationsForUsers } from "@/lib/notifications/create";
import { revalidatePath } from "next/cache";
import { learnFromFinalizedWeek } from "@/lib/ai/learn-on-finalize";
import { logServerError } from "@/lib/server-logger";
import { formatAutopilotUserReport } from "@/lib/planning/autopilot-report";
import { clampWeekIndex, normalizeCycleWeeks } from "@/lib/shift-cycle";

const CAN_RUN = new Set(["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"]);

export async function runAutopilotDraft(weekIndex: number, options?: AutopilotOptions) {
  const { companyId, role } = await requireTenant();
  if (!CAN_RUN.has(role ?? "")) throw new Error("Keine Berechtigung für den Autopilot.");

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { shiftCycleWeeks: true },
  });
  const wk = clampWeekIndex(weekIndex, normalizeCycleWeeks(company?.shiftCycleWeeks));
  const plan = await generateOptimalSchedule(companyId, wk, options);

  await db.$transaction(async (tx) => {
    await tx.shift.deleteMany({
      where: tenantWhere(companyId, { weekIndex: wk, isDraft: true }),
    });
    if (plan.shifts.length > 0) {
      await tx.shift.createMany({ data: plan.shifts });
    }
  });

  revalidatePath("/dashboard/planning");
  const report = formatAutopilotUserReport({
    shiftsCreated: plan.shifts.length,
    unfilled: plan.unfilled,
    teamPoolSize: plan.teamPoolSize,
  });
  return {
    ok: true as const,
    shiftsCreated: plan.shifts.length,
    unfilled: plan.unfilled,
    teamPoolSize: plan.teamPoolSize,
    report,
  };
}

export async function confirmAutopilotDrafts(weekIndex: number) {
  const { companyId, role } = await requireTenant();
  if (!CAN_RUN.has(role ?? "")) throw new Error("Keine Berechtigung.");

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { shiftCycleWeeks: true },
  });
  const wk = clampWeekIndex(weekIndex, normalizeCycleWeeks(company?.shiftCycleWeeks));

  let affectedUserIds: string[] = [];
  await db.$transaction(async (tx) => {
    const [published, drafts] = await Promise.all([
      tx.shift.findMany({
        where: tenantWhere(companyId, { weekIndex: wk, isDraft: false }),
        select: {
          id: true,
          userId: true,
          weekIndex: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
        },
      }),
      tx.shift.findMany({
        where: tenantWhere(companyId, { weekIndex: wk, isDraft: true }),
        select: {
          id: true,
          userId: true,
          weekIndex: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
        },
      }),
    ]);

    if (drafts.length === 0) return;

    const toRow = (s: (typeof published)[0]): ShiftPlanRow => ({
      id: s.id,
      userId: s.userId,
      weekIndex: s.weekIndex,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
    });

    assertDraftsPublishable(published.map(toRow), drafts.map(toRow), wk);

    await tx.shift.updateMany({
      where: tenantWhere(companyId, { weekIndex: wk, isDraft: true }),
      data: { isDraft: false },
    });

    affectedUserIds = Array.from(new Set(drafts.map((d) => d.userId)));
  });

  if (affectedUserIds.length > 0) {
    await createNotificationsForUsers({
      companyId,
      userIds: affectedUserIds,
      type: "SHIFT_PUBLISHED",
      title: "Neuer Schichtplan veröffentlicht",
      body: `Wochenplan KW-Index ${wk} ist live – jetzt deine Schichten ansehen.`,
      href: "/dashboard/planning",
    });
  }

  // VREMA Native Core AI: aus dem finalisierten Plan lernen.
  // Fire-and-forget – Fehler dürfen die Publikation nie verhindern.
  learnFromFinalizedWeek(companyId, wk).catch((err) =>
    logServerError("ai-learn-on-finalize", err),
  );

  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard");
}

export async function discardAutopilotDrafts(weekIndex: number) {
  const { companyId, role } = await requireTenant();
  if (!CAN_RUN.has(role ?? "")) throw new Error("Keine Berechtigung.");

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { shiftCycleWeeks: true },
  });
  const wk = clampWeekIndex(weekIndex, normalizeCycleWeeks(company?.shiftCycleWeeks));

  await db.$transaction(async (tx) => {
    await tx.shift.deleteMany({
      where: tenantWhere(companyId, { weekIndex: wk, isDraft: true }),
    });
  });

  revalidatePath("/dashboard/planning");
}
