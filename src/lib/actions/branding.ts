"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant-guard";
import { canUseCustomBranding } from "@/lib/plan-limits";
import { normalizeHex, VREMA_DEFAULT_BRAND_HEX, VREMA_DEFAULT_BRAND_HEX_DARK } from "@/lib/branding/load";

export async function getBrandingSettings() {
  const { companyId, role } = await requireTenant();
  if (role !== "COMPANY_OWNER" && role !== "SUPER_ADMIN") {
    throw new Error("Branding-Einstellungen sind nur für den Inhaber verfügbar.");
  }
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { brandColor: true, brandColorDark: true, plan: true },
  });
  return {
    brandColor: company?.brandColor ?? null,
    brandColorDark: company?.brandColorDark ?? null,
    plan: company?.plan ?? "PETITE",
  };
}

export async function updateBranding(data: {
  brandColor?: string | null;
  brandColorDark?: string | null;
}) {
  const { companyId, role } = await requireTenant();
  if (role !== "COMPANY_OWNER" && role !== "SUPER_ADMIN") {
    throw new Error("Branding-Einstellungen sind nur für den Inhaber verfügbar.");
  }

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { plan: true },
  });
  if (!company) throw new Error("Firma nicht gefunden.");
  if (!canUseCustomBranding(company.plan) && role !== "SUPER_ADMIN") {
    throw new Error("Custom-Branding ist in deinem Tarif enthalten — bitte Tarif prüfen.");
  }

  const brandColor =
    data.brandColor === null
      ? null
      : data.brandColor !== undefined
        ? normalizeHex(data.brandColor, VREMA_DEFAULT_BRAND_HEX)
        : undefined;
  const brandColorDark =
    data.brandColorDark === null
      ? null
      : data.brandColorDark !== undefined
        ? normalizeHex(data.brandColorDark, VREMA_DEFAULT_BRAND_HEX_DARK)
        : undefined;

  await db.company.update({
    where: { id: companyId },
    data: {
      ...(brandColor !== undefined ? { brandColor } : {}),
      ...(brandColorDark !== undefined ? { brandColorDark } : {}),
    },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}
