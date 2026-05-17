"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { sendNoShowReminderEmail } from "@/lib/email/transactional";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import { getBerlinDateKey, berlinDateKeyToDayOfWeek } from "@/lib/time/timezone";

/**
 *  No-Show-Erkennung & 1-Click-Erinnerung.
 *  Manager-Funktion: lädt Mitarbeitende, deren Schicht laut Plan begonnen hat,
 *  die aber bisher nicht eingestempelt sind.
 */

export type NoShowEntry = {
  shiftId: string;
  userId: string;
  userName: string | null;
  startTime: string;
  endTime: string;
  minutesLate: number;
};

const NO_SHOW_THRESHOLD_MIN = 10;

export async function listNoShows(): Promise<NoShowEntry[]> {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const todayKey = getBerlinDateKey(new Date());
  const dow = berlinDateKeyToDayOfWeek(todayKey);

  const shifts = await db.shift.findMany({
    where: tenantWhere(companyId, { isDraft: false, dayOfWeek: dow }),
    select: {
      id: true,
      userId: true,
      startTime: true,
      endTime: true,
      user: { select: { name: true } },
    },
  });

  // Berlin-Wand-Uhr: jetzt in Minuten seit Mitternacht
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [hStr, mStr] = fmt.format(now).split(":");
  const nowMinutes = Number(hStr) * 60 + Number(mStr);

  // Heute aktive WorkLogs (= bereits eingestempelt) → ignorieren
  const startOfTodayUtc = new Date(`${todayKey}T00:00:00Z`);
  const endOfTodayUtc = new Date(startOfTodayUtc.getTime() + 24 * 60 * 60 * 1000);
  const activeLogs = await db.workLog.findMany({
    where: tenantWhere(companyId, {
      clockIn: { gte: startOfTodayUtc, lt: endOfTodayUtc },
    }),
    select: { userId: true },
  });
  const stampedUserIds = new Set(activeLogs.map((l) => l.userId));

  const out: NoShowEntry[] = [];
  for (const s of shifts) {
    if (stampedUserIds.has(s.userId)) continue;
    const [sh, sm] = s.startTime.split(":").map(Number);
    const startMinutes = sh * 60 + sm;
    const minutesLate = nowMinutes - startMinutes;
    if (minutesLate >= NO_SHOW_THRESHOLD_MIN) {
      out.push({
        shiftId: s.id,
        userId: s.userId,
        userName: s.user?.name ?? null,
        startTime: s.startTime,
        endTime: s.endTime,
        minutesLate,
      });
    }
  }
  return out.sort((a, b) => b.minutesLate - a.minutesLate);
}

/**
 *  Erinnerung an fehlendes Einstempeln: In-App-Notification + E-Mail (Resend).
 */
export async function sendNoShowReminder(shiftId: string): Promise<void> {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const shift = await db.shift.findFirst({
    where: tenantWhere(companyId, { id: shiftId }),
    select: {
      id: true,
      userId: true,
      startTime: true,
      endTime: true,
      user: { select: { name: true, email: true } },
      company: { select: { name: true } },
    },
  });
  if (!shift) throw new Error("Schicht nicht gefunden.");
  if (!shift.user?.email?.trim()) {
    throw new Error("Mitarbeiter hat keine E-Mail-Adresse hinterlegt.");
  }

  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [hStr, mStr] = fmt.format(now).split(":");
  const nowMinutes = Number(hStr) * 60 + Number(mStr);
  const [sh, sm] = shift.startTime.split(":").map(Number);
  const minutesLate = Math.max(0, nowMinutes - (sh * 60 + sm));

  await db.notification.create({
    data: {
      companyId,
      userId: shift.userId,
      type: "GENERIC",
      title: "Erinnerung: Schicht hat begonnen",
      body: `Deine Schicht ${shift.startTime} – ${shift.endTime} hat begonnen. Bitte stempel dich jetzt ein.`,
      href: "/dashboard?action=clockin",
    },
  });

  await sendNoShowReminderEmail({
    recipientName: shift.user.name?.trim() || "Team",
    recipientEmail: shift.user.email.trim(),
    companyName: shift.company.name,
    startTime: shift.startTime,
    endTime: shift.endTime,
    minutesLate,
  });

  revalidatePath("/dashboard");
}
