"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { toggleClockForUser } from "@/lib/worklogs/clock-core";
import { checkClockIpAllowlist, getClientIpFromHeaders } from "@/lib/security/ip-allowlist";
import { userErrorMessage } from "@/lib/errors/user-message";

export async function validatePinAndClock(companySlug: string, pin: string) {
  const normalizedPin = pin.trim();
  if (!/^\d{4,8}$/.test(normalizedPin)) {
    return { status: "error" as const, message: "Ungültige PIN." };
  }

  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: {
      id: true,
      isActive: true,
      trialEndsAt: true,
      stripeSubId: true,
      subEndsAt: true,
      clockIpRestrictionEnabled: true,
      clockIpAllowlist: true,
    },
  });

  const { companyHasOperationalAccess } = await import("@/lib/trial/access");
  const { isTrialExpired } = await import("@/lib/trial");

  if (!company || !companyHasOperationalAccess(company)) {
    return { status: "error" as const, message: "Terminal ist nicht verfügbar." };
  }

  if (isTrialExpired(company)) {
    return {
      status: "error" as const,
      message: "Testphase beendet. Der Betrieb muss zuerst einen Tarif wählen.",
    };
  }

  // Enterprise: IP-Geofencing greift, falls aktiv. Terminal-Pfad kennt keine
  // Session, daher prüfen wir hier direkt – noch VOR dem bcrypt-Sweep.
  if (company.clockIpRestrictionEnabled) {
    const reqHeaders = await headers();
    const clientIp = getClientIpFromHeaders(reqHeaders);
    const ipResult = checkClockIpAllowlist({
      enabled: true,
      allowlist: company.clockIpAllowlist,
      clientIp,
    });
    if (!ipResult.ok) {
      return {
        status: "error" as const,
        message:
          ipResult.reason === "no_client_ip"
            ? "Verbindung zum Firmen-WLAN nicht erkannt. Bitte mit dem Firmen-Netz verbinden."
            : "Stempeln nur am Standort möglich. Diese IP ist nicht freigegeben.",
      };
    }
  }

  // Kandidaten = nur Mitarbeiter mit gesetztem Terminal-PIN-Hash.
  // Wir können hier nicht per Email lookupen (Terminal kennt nur PIN), deshalb
  // ist die O(n)-bcrypt-Schleife by design: bcrypt-Vergleiche sind timing-safe,
  // und der Suchraum bleibt klein (typisch 10–50 Mitarbeiter pro Firma).
  // Edge-Rate-Limit für `POST /terminal/*` schützt zusätzlich gegen Brute-Force.
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
      message: userErrorMessage(error, "Stempeln fehlgeschlagen."),
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
