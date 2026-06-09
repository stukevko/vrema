/**
 * Einfaches In-Memory-Rate-Limit für Server Actions (Passwort-Reset etc.).
 * Pro Node-Instanz — ausreichend für PM2-Single-Instance; bei Cluster Redis erwägen.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkServerActionRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}
