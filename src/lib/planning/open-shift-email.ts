/** Client- und Server-tauglich — ohne DB-Import. */
export const OPEN_SHIFT_EMAIL_SUFFIX = "@vrema.local";

export function isOpenShiftPlaceholderEmail(email: string): boolean {
  return email.endsWith(OPEN_SHIFT_EMAIL_SUFFIX) && email.startsWith("open-slot+");
}
