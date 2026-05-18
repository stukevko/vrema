import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import bcrypt from "bcryptjs";

export const OPEN_SHIFT_EMAIL_SUFFIX = "@vrema.local";

export function isOpenShiftPlaceholderEmail(email: string): boolean {
  return email.endsWith(OPEN_SHIFT_EMAIL_SUFFIX) && email.startsWith("open-slot+");
}

/** Technischer Platzhalter pro Firma — zählt nicht als aktiver Mitarbeiter. */
export async function ensureOpenShiftPlaceholderUser(companyId: string): Promise<string> {
  const email = `open-slot+${companyId}${OPEN_SHIFT_EMAIL_SUFFIX}`;

  const existing = await db.user.findFirst({
    where: tenantWhere(companyId, { email }),
    select: { id: true },
  });
  if (existing) return existing.id;

  const hash = await bcrypt.hash(Math.random().toString(36).slice(2) + "Aa1!", 10);
  const pinHash = await bcrypt.hash("0000", 10);

  const created = await db.user.create({
    data: {
      companyId,
      email,
      name: "Offene Schicht",
      password: hash,
      terminalPin: "0000",
      terminalPinHash: pinHash,
      role: "EMPLOYEE",
      isActive: false,
      emailVerified: new Date(),
    },
    select: { id: true },
  });

  return created.id;
}
