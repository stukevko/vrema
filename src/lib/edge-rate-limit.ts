import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

function prune(now: number) {
  if (store.size < 3000) return;
  for (const [k, v] of store) {
    if (v.resetAt < now) store.delete(k);
  }
}

/**
 * Einfaches festes Fenster pro Edge-Instanz (ohne Redis).
 * Für mehrere Instanzen/Vercel: UPSTASH o. Ä. ergänzen — dann konsistent über alle Nodes.
 */
export function checkMemRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  prune(now);
  const b = store.get(key);
  if (!b || now > b.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= max) return false;
  b.count += 1;
  return true;
}

export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}
