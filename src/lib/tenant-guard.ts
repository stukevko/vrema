import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Call at the top of every Server Action or Server Component that accesses DB data.
 * Returns { userId, companyId } – throws/redirects on failure.
 */
export async function requireTenant() {
  "use server";

  const session = await auth();

  if (!session?.user?.id || !session?.user?.companyId) {
    redirect("/auth/login");
  }

  return {
    userId: session.user.id,
    companyId: session.user.companyId,
    role: session.user.role,
    plan: session.user.plan,
  };
}

/** Für Server Actions: kein redirect() — verhindert 500, wenn die Session abgelaufen ist. */
export type TenantActionResult =
  | {
      ok: true;
      userId: string;
      companyId: string;
      role: string | undefined;
      plan: string | undefined;
    }
  | { ok: false; error: string };

export async function requireTenantAction(): Promise<TenantActionResult> {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.companyId) {
    return { ok: false, error: "Bitte erneut anmelden." };
  }
  return {
    ok: true,
    userId: session.user.id,
    companyId: session.user.companyId,
    role: session.user.role,
    plan: session.user.plan,
  };
}

/**
 * Wraps a Prisma where-clause to always include company_id.
 * Prevents accidental cross-tenant queries.
 */
export function tenantWhere<T extends Record<string, unknown>>(
  companyId: string,
  extra?: T
): T & { companyId: string } {
  return { companyId, ...extra } as T & { companyId: string };
}
