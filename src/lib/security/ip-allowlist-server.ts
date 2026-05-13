"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  checkClockIpAllowlist,
  getClientIpFromHeaders,
} from "@/lib/security/ip-allowlist";

/**
 * Wirft `Error("Stempeln nur am Standort möglich")`, wenn IP-Geofencing
 * aktiv ist und die Anfrage NICHT von einer erlaubten IP kommt.
 *
 *  Verwendung am Anfang jeder Clock-Action, NACH dem Tenant-Check.
 */
export async function assertClockIpAllowed(companyId: string): Promise<void> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { clockIpRestrictionEnabled: true, clockIpAllowlist: true },
  });
  if (!company) throw new Error("Firma nicht gefunden");
  if (!company.clockIpRestrictionEnabled) return;

  const reqHeaders = await headers();
  const clientIp = getClientIpFromHeaders(reqHeaders);
  const result = checkClockIpAllowlist({
    enabled: company.clockIpRestrictionEnabled,
    allowlist: company.clockIpAllowlist,
    clientIp,
  });

  if (!result.ok) {
    if (result.reason === "no_client_ip") {
      throw new Error(
        "Stempeln gerade nicht möglich: deine Internet-Verbindung wurde nicht erkannt. Bitte verbinde dich mit dem Firmen-WLAN.",
      );
    }
    throw new Error(
      "Stempeln nur am Standort möglich. Diese IP-Adresse ist in den Firmen-Einstellungen nicht freigegeben.",
    );
  }
}
