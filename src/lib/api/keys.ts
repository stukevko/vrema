/**
 * VREMA External API Keys
 * ────────────────────────
 *  - Klartext-Key wird **einmalig** bei Erstellung zurückgegeben.
 *  - In der DB liegt nur `sha256(klartext)` als deterministischer Hash → indexable,
 *    O(1)-Lookup beim Auth-Check.
 *  - Format: `vrema_live_<base64url(32 random bytes)>` (sprechend, prefixable für
 *    Secret-Scanner wie Gitleaks/GitHub-Push-Protection).
 *
 * Sicherheits-Überlegungen:
 *  - SHA-256 (statt bcrypt) ist hier korrekt, weil Klartext aus 32 Bytes Crypto-
 *    Entropie besteht → kein "Wörterbuch-Risiko"; Auth-Check muss schnell sein.
 *  - Wir geben dem Anrufer NIE den Hash zurück.
 *  - `keyHint` = die letzten 4 Zeichen – reicht, um Keys in der UI auseinanderzuhalten,
 *    ohne den Klartext zu leaken.
 */

import { createHash, randomBytes, timingSafeEqual } from "crypto";

const KEY_PREFIX = "vrema_live_";

export type IssuedApiKey = {
  /** Klartext-Key, NUR einmalig nach Erstellung zurückgeben. */
  plainKey: string;
  /** SHA-256-Hash (Hex) – in DB speichern. */
  hashedKey: string;
  /** Letzte 4 Zeichen für UI-Wiedererkennung. */
  keyHint: string;
};

/** Generiert einen frischen API-Key mit 32 Bytes Entropie + Hash + Hint. */
export function issueApiKey(): IssuedApiKey {
  const randomPart = randomBytes(32).toString("base64url");
  const plainKey = `${KEY_PREFIX}${randomPart}`;
  const hashedKey = hashApiKey(plainKey);
  const keyHint = plainKey.slice(-4);
  return { plainKey, hashedKey, keyHint };
}

/** SHA-256(plain) als Hex – deterministisch fürs DB-Lookup. */
export function hashApiKey(plainKey: string): string {
  return createHash("sha256").update(plainKey, "utf8").digest("hex");
}

/**
 * Vergleicht zwei Hash-Strings timing-safe. Wir hashen den Eingabewert
 * vorher (siehe `findApiKeyRecord`) und vergleichen dann mit DB-Hash.
 */
export function verifyHashConstantTime(expected: string, actual: string): boolean {
  if (expected.length !== actual.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
  } catch {
    return false;
  }
}

/** Wahrt das Format vor weiteren Operationen. */
export function looksLikeApiKey(value: string | null | undefined): value is string {
  if (!value) return false;
  return value.startsWith(KEY_PREFIX) && value.length >= KEY_PREFIX.length + 32;
}
