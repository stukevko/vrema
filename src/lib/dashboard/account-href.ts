/** Einstellungen-Center vs. persönliches Konto (nur Mitarbeitende). */
export function getPersonalAccountHref(role: string | null | undefined): string {
  return role === "EMPLOYEE" ? "/dashboard/account" : "/dashboard/settings";
}
