"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import { issueApiKey } from "@/lib/api/keys";

/** Owner / Super-Admin only. */
async function requireOwner() {
  const { companyId, userId, role } = await requireTenant();
  if (role !== "COMPANY_OWNER" && role !== "SUPER_ADMIN") {
    throw new Error("API-Keys dürfen nur vom Inhaber oder Super-Admin verwaltet werden.");
  }
  return { companyId, userId };
}

export async function listApiKeys() {
  const { companyId } = await requireOwner();
  return db.apiKey.findMany({
    where: tenantWhere(companyId),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyHint: true,
      scopes: true,
      isActive: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
  });
}

export async function createApiKey(data: { name: string; scopes?: string[]; expiresAt?: Date | null }) {
  const { companyId, userId } = await requireOwner();

  const name = data.name?.trim();
  if (!name || name.length < 3) {
    throw new Error("Bitte einen sprechenden Namen mit mindestens 3 Zeichen vergeben.");
  }
  if (name.length > 80) {
    throw new Error("Der Name darf maximal 80 Zeichen lang sein.");
  }

  const allowedScopes = new Set(["status:read"]);
  const scopes = (data.scopes ?? ["status:read"])
    .map((s) => s.trim())
    .filter((s) => allowedScopes.has(s));
  if (scopes.length === 0) {
    throw new Error("Mindestens ein gültiger Scope nötig (z.B. status:read).");
  }

  const { plainKey, hashedKey, keyHint } = issueApiKey();

  const created = await db.apiKey.create({
    data: {
      companyId,
      name,
      hashedKey,
      keyHint,
      scopes,
      createdById: userId,
      expiresAt: data.expiresAt ?? null,
    },
    select: { id: true, name: true, keyHint: true, scopes: true, createdAt: true },
  });

  revalidatePath("/dashboard/settings");

  // Klartext NUR einmalig zurückgeben (kein Re-Display in der UI).
  return { ...created, plainKey };
}

export async function revokeApiKey(id: string) {
  const { companyId } = await requireOwner();
  const existing = await db.apiKey.findFirst({
    where: tenantWhere(companyId, { id }),
    select: { id: true },
  });
  if (!existing) throw new Error("API-Key nicht gefunden.");

  await db.apiKey.update({
    where: { id: existing.id },
    data: { isActive: false },
  });

  revalidatePath("/dashboard/settings");
}

export async function deleteApiKey(id: string) {
  const { companyId } = await requireOwner();
  const existing = await db.apiKey.findFirst({
    where: tenantWhere(companyId, { id }),
    select: { id: true },
  });
  if (!existing) throw new Error("API-Key nicht gefunden.");

  await db.apiKey.delete({ where: { id: existing.id } });

  revalidatePath("/dashboard/settings");
}
