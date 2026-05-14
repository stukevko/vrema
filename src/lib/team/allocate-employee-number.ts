import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/** Erste automatische Personalnummer in einer neuen Firma (DATEV-üblicher Bereich). */
export const EMPLOYEE_NUMBER_AUTO_START = 10001;

function parseStrictPositiveInt(value: string): number | null {
  const t = value.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Nächste firmenweit eindeutige **numerische** Personalnummer (nur Ziffern).
 * Alphanumerische Einträge (z. B. aus Import) werden bei der Maximumsbildung ignoriert.
 */
export async function nextNumericEmployeeNumber(
  companyId: string,
  tx: Prisma.TransactionClient,
): Promise<string> {
  const rows = await tx.user.findMany({
    where: { companyId, employeeNumber: { not: null } },
    select: { employeeNumber: true },
  });
  let max = EMPLOYEE_NUMBER_AUTO_START - 1;
  for (const r of rows) {
    if (!r.employeeNumber) continue;
    const n = parseStrictPositiveInt(r.employeeNumber);
    if (n != null && n > max) max = n;
  }
  return String(max + 1);
}

/**
 * Vergibt allen Nutzer:innen der Firma ohne Personalnummer eine automatische Nummer
 * (deterministisch nach Erstellungszeit). Serializable, um Doppelvergaben bei Parallelzugriff zu vermeiden.
 */
export async function assignMissingEmployeeNumbersForCompany(companyId: string): Promise<number> {
  let assigned = 0;
  await db.$transaction(
    async (tx) => {
      const missing = await tx.user.findMany({
        where: { companyId, employeeNumber: null },
        select: { id: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      for (const m of missing) {
        const next = await nextNumericEmployeeNumber(companyId, tx);
        await tx.user.update({
          where: { id: m.id },
          data: { employeeNumber: next },
        });
        assigned += 1;
      }
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 15000,
    },
  );
  return assigned;
}
