"use server";

import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import { revalidatePath } from "next/cache";

export type ShiftTemplateRow = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string | null;
  sortOrder: number;
};

const DEFAULT_TEMPLATES: Array<Omit<ShiftTemplateRow, "id" | "sortOrder">> = [
  { name: "Frühschicht", startTime: "08:00", endTime: "16:00", color: "#f59e0b" },
  { name: "Tagschicht", startTime: "09:00", endTime: "17:00", color: "#0ea5e9" },
  { name: "Spätschicht", startTime: "14:00", endTime: "22:00", color: "#8b5cf6" },
];

function parseTimeHHMM(value: string): string | null {
  const v = value.trim();
  if (!/^\d{1,2}:\d{2}$/.test(v)) return null;
  const [h, m] = v.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m) || m < 0 || m > 59) return null;
  if (h === 24 && m === 0) return "24:00";
  if (h < 0 || h > 23) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function parseColor(value: string | null | undefined): string | null {
  const c = value?.trim();
  if (!c) return null;
  if (!/^#[0-9A-Fa-f]{6}$/.test(c)) return null;
  return c.toLowerCase();
}

async function seedDefaultTemplates(companyId: string) {
  await db.shiftTemplate.createMany({
    data: DEFAULT_TEMPLATES.map((t, i) => ({
      companyId,
      name: t.name,
      startTime: t.startTime,
      endTime: t.endTime,
      color: t.color,
      sortOrder: i,
    })),
  });
}

export async function getShiftTemplatesForCompany(
  companyId: string,
  role: string,
): Promise<ShiftTemplateRow[]> {
  if (!["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    return [];
  }

  let rows = await db.shiftTemplate.findMany({
    where: tenantWhere(companyId),
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      startTime: true,
      endTime: true,
      color: true,
      sortOrder: true,
    },
  });

  if (rows.length === 0 && (role === "COMPANY_OWNER" || role === "SUPER_ADMIN")) {
    await seedDefaultTemplates(companyId);
    rows = await db.shiftTemplate.findMany({
      where: tenantWhere(companyId),
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        startTime: true,
        endTime: true,
        color: true,
        sortOrder: true,
      },
    });
  }

  return rows;
}

export async function getShiftTemplates(): Promise<ShiftTemplateRow[]> {
  const { companyId, role } = await requireTenant();
  return getShiftTemplatesForCompany(companyId, role ?? "EMPLOYEE");
}

export async function createShiftTemplate(input: {
  name: string;
  startTime: string;
  endTime: string;
  color?: string | null;
}) {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const name = input.name.trim();
  if (!name || name.length > 80) {
    throw new Error("Bitte einen Namen für die Vorlage angeben (max. 80 Zeichen).");
  }

  const startTime = parseTimeHHMM(input.startTime);
  const endTime = parseTimeHHMM(input.endTime);
  if (!startTime || !endTime) {
    throw new Error("Ungültige Uhrzeit. Format: HH:MM.");
  }
  if (startTime === endTime) {
    throw new Error("Start und Ende dürfen nicht gleich sein.");
  }

  const maxOrder = await db.shiftTemplate.aggregate({
    where: tenantWhere(companyId),
    _max: { sortOrder: true },
  });

  const created = await db.shiftTemplate.create({
    data: {
      companyId,
      name,
      startTime,
      endTime,
      color: parseColor(input.color),
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
    select: {
      id: true,
      name: true,
      startTime: true,
      endTime: true,
      color: true,
      sortOrder: true,
    },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/planning");
  return created;
}

export async function deleteShiftTemplate(templateId: string) {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Keine Berechtigung.");
  }

  const existing = await db.shiftTemplate.findFirst({
    where: tenantWhere(companyId, { id: templateId }),
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Vorlage nicht gefunden.");
  }

  await db.shiftTemplate.delete({
    where: { id: templateId },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/planning");
}
