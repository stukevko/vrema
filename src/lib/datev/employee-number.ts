/**
 * Deterministische Fallback-Nummer auf Basis der User-ID.
 * Keine Seiteneffekte, keine zufälligen Werte.
 */
function hashToBase36(value: string): string {
  let hash = 2166136261; // FNV-1a start
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const unsigned = hash >>> 0;
  return unsigned.toString(36).toUpperCase();
}

export function resolveMitarbeiterNummer(employeeNumber: string | null | undefined, userId: string): string {
  const cleaned = (employeeNumber ?? "").trim();
  if (cleaned) return cleaned;
  const suffix = hashToBase36(userId).padStart(6, "0").slice(0, 6);
  return `MA-${suffix}`;
}

