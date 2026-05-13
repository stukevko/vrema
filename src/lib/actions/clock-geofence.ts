"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant-guard";
import { validateAllowlistEntry } from "@/lib/security/ip-allowlist";

export async function getClockGeofenceSettings() {
  const { companyId, role } = await requireTenant();
  if (role !== "COMPANY_OWNER" && role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized: Geofence-Einstellungen sind Owner-only.");
  }
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { clockIpRestrictionEnabled: true, clockIpAllowlist: true },
  });
  return {
    enabled: company?.clockIpRestrictionEnabled ?? false,
    allowlist: company?.clockIpAllowlist ?? [],
  };
}

export async function updateClockGeofence(input: {
  enabled: boolean;
  allowlist: string[];
}) {
  const { companyId, role } = await requireTenant();
  if (role !== "COMPANY_OWNER" && role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized: Geofence-Einstellungen sind Owner-only.");
  }

  // Sanitize + validate
  const cleaned: string[] = [];
  for (const entry of input.allowlist ?? []) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const check = validateAllowlistEntry(trimmed);
    if (!check.ok) {
      throw new Error(`Ungültiger Eintrag "${trimmed}": ${check.message}`);
    }
    if (!cleaned.includes(trimmed)) cleaned.push(trimmed);
  }
  if (cleaned.length > 50) {
    throw new Error("Maximal 50 Einträge in der Allowlist.");
  }

  if (input.enabled && cleaned.length === 0) {
    throw new Error("Bitte mindestens eine IP-Adresse oder einen CIDR-Block eintragen, bevor das Geofencing aktiviert wird.");
  }

  await db.company.update({
    where: { id: companyId },
    data: {
      clockIpRestrictionEnabled: input.enabled,
      clockIpAllowlist: { set: cleaned },
    },
  });

  revalidatePath("/dashboard/settings");
}
