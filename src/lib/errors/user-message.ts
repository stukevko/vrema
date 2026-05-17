/**
 * Wandelt Server-/Client-Fehler in sichere Nutzertexte um.
 * Deutsche Action-Messages bleiben erhalten; technische Leaks (Prisma, Digest, EN-Stack) nicht.
 */
const BLOCKED_PATTERNS: RegExp[] = [
  /prisma/i,
  /unique constraint/i,
  /foreign key/i,
  /\bP20\d{3}\b/,
  /digest/i,
  /Minified React/i,
  /Server Components/i,
  /\bNEXT_/,
  /ECONNREFUSED/i,
  /Cannot read propert/i,
  /Invalid `prisma/i,
  /Invalid `.*` invocation/i,
  /Unauthorized:/i,
  /Failed to fetch/i,
  /\n\s+at\s+/m,
  /^\s*at\s+\S+/m,
];

const GERMAN_HINT =
  /[äöüßÄÖÜ]|^(Bitte|Keine|Kein|Diese|Sie |Du |Ungültig|Schicht|Mitarbeiter|Nur |Bereits |Mindestens |Firma |Urlaub|Passwort|PIN |Stempel|Berechtigung)/;

function isBlocked(message: string): boolean {
  if (message.length > 220) return true;
  return BLOCKED_PATTERNS.some((re) => re.test(message));
}

function isSafeGermanUserMessage(message: string): boolean {
  if (isBlocked(message)) return false;
  if (GERMAN_HINT.test(message)) return true;
  if (/^[A-ZÄÖÜ][^.!?]{8,}[.!?]?$/.test(message) && !/\b(error|failed|exception|invalid)\b/i.test(message)) {
    return true;
  }
  return false;
}

export function userErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const raw = err.message?.trim() ?? "";
  if (!raw) return fallback;
  const message = raw.replace(/^Error:\s*/i, "");
  if (isSafeGermanUserMessage(message)) return message;
  return fallback;
}
