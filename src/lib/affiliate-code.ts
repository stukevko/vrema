import { db } from "@/lib/db";

const CODE_SAFE = /^[a-z0-9]{2,40}$/;

function nameToSlugPart(name: string): string {
  const s = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 12);
  return s.length >= 2 ? s : `partner${s}`.slice(0, 12) || "partner";
}

/** z. B. kevin847 — kurz, URL-tauglich, eindeutig in der DB */
export async function generateUniqueAffiliateCode(displayName: string): Promise<string> {
  const base = nameToSlugPart(displayName.trim() || "partner");

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const suffix = Math.floor(100 + Math.random() * 900).toString();
    const code = `${base}${suffix}`.slice(0, 63);
    if (!CODE_SAFE.test(code)) continue;
    const taken = await db.affiliate.findUnique({ where: { code }, select: { id: true } });
    if (!taken) return code;
  }

  throw new Error("Konnte keinen freien Partner-Code erzeugen. Bitte erneut versuchen.");
}

export function publicRegisterRefUrl(code: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "https://vrema.app").replace(/\/$/, "");
  return `${base}/auth/register?ref=${encodeURIComponent(code)}`;
}
