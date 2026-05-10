"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";

const MANAGER_ROLES = new Set(["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN", "SUPPORT"]);

const DEMO_TEMPLATE_NAME = "Schlussdienst Bar";
const DEMO_STAFFING_ROLE = "Bar";

const DEMO_ITEMS: { title: string; sortOrder: number }[] = [
  { title: "Kaffeemaschine reinigen", sortOrder: 0 },
  { title: "Terrasse abschließen", sortOrder: 1 },
  { title: "Kassensturz machen", sortOrder: 2 },
  { title: "Licht aus", sortOrder: 3 },
  { title: "Fenster prüfen", sortOrder: 4 },
];

function assertDemoTemplateAllowed() {
  const allowed =
    process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_TASK_SEED === "true";
  if (!allowed) {
    throw new Error(
      "debug_createDemoTemplate ist nur in Entwicklung aktiv. Für Staging: ALLOW_DEMO_TASK_SEED=true setzen.",
    );
  }
}

/**
 * Legt das Demo-Template „Schlussdienst Bar“ (Rolle Bar, 5 Items) an oder ersetzt es idempotent.
 * Nur Manager-Rollen; Produktion nur mit ALLOW_DEMO_TASK_SEED=true.
 *
 * Nach dem Anlegen: Nutzer mit `staffingRole === "Bar"` und passender Schicht für heute
 * erhalten beim Einstempeln automatisch die Checkliste (Auto-Provisioning).
 */
export async function debug_createDemoTemplate(): Promise<{ ok: true; templateId: string }> {
  assertDemoTemplateAllowed();
  const { companyId, role } = await requireTenant();
  if (!MANAGER_ROLES.has(role ?? "")) {
    throw new Error("Keine Berechtigung.");
  }

  const existing = await db.taskTemplate.findFirst({
    where: tenantWhere(companyId, {
      name: DEMO_TEMPLATE_NAME,
      staffingRole: DEMO_STAFFING_ROLE,
    }),
    select: { id: true },
  });

  let templateId: string;

  if (existing) {
    await db.taskTemplateItem.deleteMany({ where: { templateId: existing.id } });
    await db.taskTemplate.update({
      where: { id: existing.id },
      data: { isDefault: false, name: DEMO_TEMPLATE_NAME, staffingRole: DEMO_STAFFING_ROLE },
    });
    await db.taskTemplateItem.createMany({
      data: DEMO_ITEMS.map((it) => ({
        templateId: existing.id,
        title: it.title,
        sortOrder: it.sortOrder,
        isRequired: true,
      })),
    });
    templateId = existing.id;
  } else {
    const created = await db.taskTemplate.create({
      data: {
        companyId,
        name: DEMO_TEMPLATE_NAME,
        staffingRole: DEMO_STAFFING_ROLE,
        isDefault: false,
        items: {
          create: DEMO_ITEMS.map((it) => ({
            title: it.title,
            sortOrder: it.sortOrder,
            isRequired: true,
          })),
        },
      },
      select: { id: true },
    });
    templateId = created.id;
  }

  revalidatePath("/dashboard");
  return { ok: true, templateId };
}
