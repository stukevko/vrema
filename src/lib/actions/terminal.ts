"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { toggleClockForUser } from "@/lib/worklogs/clock-core";

export async function validatePinAndClock(companySlug: string, pin: string) {
  const normalizedPin = pin.trim();
  if (!/^\d{4,8}$/.test(normalizedPin)) {
    return { status: "error" as const, message: "Ungültige PIN." };
  }

  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: { id: true, isActive: true },
  });

  if (!company || !company.isActive) {
    return { status: "error" as const, message: "Terminal ist nicht verfügbar." };
  }

  const users = await db.user.findMany({
    where: { companyId: company.id, isActive: true, terminalPinHash: { not: null } },
    select: { id: true, name: true, terminalPinHash: true },
  });

  let matchedUser: { id: string; name: string | null } | null = null;
  for (const user of users) {
    if (!user.terminalPinHash) continue;
    const valid = await bcrypt.compare(normalizedPin, user.terminalPinHash);
    if (valid) {
      matchedUser = { id: user.id, name: user.name };
      break;
    }
  }

  if (!matchedUser) {
    return { status: "error" as const, message: "Falsche PIN." };
  }

  let result;
  try {
    result = await toggleClockForUser({
      companyId: company.id,
      userId: matchedUser.id,
    });
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Stempeln fehlgeschlagen.",
    };
  }

  return {
    status: "success" as const,
    message:
      result.type === "clock_in"
        ? `${matchedUser.name ?? "Mitarbeiter"} erfolgreich eingestempelt.`
        : `${matchedUser.name ?? "Mitarbeiter"} erfolgreich ausgestempelt.`,
  };
}
