"use server";

import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function getCompanySettings() {
  const { companyId } = await requireTenant();

  return db.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      logoUrl: true,
      geoRadiusMeters: true,
      geoLatitude: true,
      geoLongitude: true,
      shiftCycleWeeks: true,
    },
  });
}

export async function updateCompanySettings(data: {
  name?: string;
  geoRadiusMeters?: number;
  geoLatitude?: number | null;
  geoLongitude?: number | null;
  shiftCycleWeeks?: number;
}) {
  const { companyId, role } = await requireTenant();

  if (role !== "COMPANY_OWNER" && role !== "SUPER_ADMIN") {
    throw new Error("Keine Berechtigung.");
  }

  await db.company.update({
    where: { id: companyId },
    data: {
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(typeof data.geoRadiusMeters === "number" && !Number.isNaN(data.geoRadiusMeters)
        ? { geoRadiusMeters: Math.max(10, Math.round(data.geoRadiusMeters)) }
        : {}),
      ...(typeof data.geoLatitude === "number" && !Number.isNaN(data.geoLatitude)
        ? { geoLatitude: data.geoLatitude }
        : data.geoLatitude === null
          ? { geoLatitude: null }
          : {}),
      ...(typeof data.geoLongitude === "number" && !Number.isNaN(data.geoLongitude)
        ? { geoLongitude: data.geoLongitude }
        : data.geoLongitude === null
          ? { geoLongitude: null }
          : {}),
      ...(typeof data.shiftCycleWeeks === "number" && Number.isFinite(data.shiftCycleWeeks)
        ? { shiftCycleWeeks: Math.min(3, Math.max(1, Math.floor(data.shiftCycleWeeks))) }
        : {}),
    },
  });

  revalidatePath("/dashboard/settings");
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  const { userId, companyId } = await requireTenant();

  if (data.newPassword.length < 8) {
    throw new Error("Neues Passwort muss mindestens 8 Zeichen haben.");
  }

  const user = await db.user.findFirst({
    where: tenantWhere(companyId, { id: userId }),
    select: { password: true },
  });

  if (!user?.password) throw new Error("Kein Passwort gesetzt (OAuth-Account).");

  const valid = await bcrypt.compare(data.currentPassword, user.password);
  if (!valid) throw new Error("Aktuelles Passwort ist falsch.");

  const hashed = await bcrypt.hash(data.newPassword, 12);
  await db.user.update({ where: { id: userId }, data: { password: hashed } });

  revalidatePath("/dashboard/settings");
}
