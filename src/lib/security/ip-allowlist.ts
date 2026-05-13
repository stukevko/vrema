/**
 * IP-Allowlist & "Geofencing via IP" für Privacy-First-Clocking.
 *
 * Wir akzeptieren in der Allowlist:
 *  - IPv4 plain        (z.B. "198.51.100.42")
 *  - IPv4 CIDR         (z.B. "203.0.113.0/24")
 *  - IPv6 plain        (z.B. "2001:db8::1")
 *  - IPv6 CIDR         (z.B. "2001:db8::/32")
 *
 * Designentscheidung: kein externes CIDR-Lib – wir implementieren einen kleinen,
 * gut testbaren Matcher direkt im Repo. Das bleibt Audit-fähig und vermeidet
 * eine weitere Supply-Chain-Abhängigkeit.
 */

/**
 * Extrahiert die wahrscheinlich-vertrauenswürdige Client-IP aus den
 * Request-Headers. Reihenfolge nach typischer Trust-Chain:
 *  1) `x-real-ip`       – setzt unser Reverse-Proxy (z.B. nginx) selbst.
 *  2) `x-forwarded-for` – erste Adresse (= Origin-Client). Mehrere Werte
 *     kommagetrennt, der erste ist immer der Client.
 *  3) fallback `null`   – wir verweigern Clock-In, wenn keine IP da ist und
 *     Geofencing aktiv.
 */
export function getClientIpFromHeaders(headers: Headers): string | null {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return normalizeIp(realIp);

  const xff = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return normalizeIp(xff);

  return null;
}

/** Strippt das optionale `::ffff:`-Prefix von IPv4-mapped-IPv6-Adressen. */
function normalizeIp(raw: string): string {
  const clean = raw.replace(/^::ffff:/i, "").trim();
  return clean;
}

function isIpv4(ip: string): boolean {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip);
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4) return null;
  for (const part of parts) {
    if (!Number.isInteger(part) || part < 0 || part > 255) return null;
  }
  return (
    ((parts[0] << 24) >>> 0) +
    ((parts[1] << 16) >>> 0) +
    ((parts[2] << 8) >>> 0) +
    parts[3]
  );
}

// BigInt-Konstanten als Funktionen statt Literale, damit das Modul auch unter
// `target: ES2018` kompiliert (Next.js verwendet BigInt zur Laufzeit
// problemlos, nur die `123n`-Literal-Syntax verlangt ES2020+).
const SIXTEEN = BigInt(16);
const HUNDRED_TWENTY_EIGHT = BigInt(128);
const ONE = BigInt(1);

function ipv6ToBigInt(ip: string): bigint | null {
  if (!ip.includes(":")) return null;
  let groups: string[];
  if (ip.includes("::")) {
    const [head, tail] = ip.split("::");
    const headGroups = head ? head.split(":") : [];
    const tailGroups = tail ? tail.split(":") : [];
    const missing = 8 - (headGroups.length + tailGroups.length);
    if (missing < 0) return null;
    groups = [...headGroups, ...Array(missing).fill("0"), ...tailGroups];
  } else {
    groups = ip.split(":");
  }
  if (groups.length !== 8) return null;
  let result = BigInt(0);
  for (const g of groups) {
    if (g.length > 4 || !/^[0-9a-fA-F]*$/.test(g)) return null;
    result = (result << SIXTEEN) | BigInt(parseInt(g || "0", 16));
  }
  return result;
}

function matchIpv4Cidr(ipInt: number, cidr: string): boolean {
  const [base, bitsRaw] = cidr.split("/");
  const bits = bitsRaw ? Number(bitsRaw) : 32;
  if (bits < 0 || bits > 32 || !Number.isInteger(bits)) return false;
  const baseInt = ipv4ToInt(base);
  if (baseInt === null) return false;
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

function matchIpv6Cidr(ipBig: bigint, cidr: string): boolean {
  const [base, bitsRaw] = cidr.split("/");
  const bits = bitsRaw ? Number(bitsRaw) : 128;
  if (bits < 0 || bits > 128 || !Number.isInteger(bits)) return false;
  const baseBig = ipv6ToBigInt(base);
  if (baseBig === null) return false;
  if (bits === 0) return true;
  const fullMask = (ONE << HUNDRED_TWENTY_EIGHT) - ONE;
  const hostMask = (ONE << BigInt(128 - bits)) - ONE;
  const mask = fullMask ^ hostMask;
  return (ipBig & mask) === (baseBig & mask);
}

/**
 * Prüft, ob `ip` einem Eintrag der Allowlist entspricht (Plain oder CIDR).
 * Whitespace + leere Einträge werden ignoriert.
 */
export function ipMatchesAllowlist(ip: string, allowlist: string[]): boolean {
  if (!ip) return false;
  const normalized = normalizeIp(ip);
  const entries = allowlist.map((e) => e.trim()).filter(Boolean);
  if (entries.length === 0) return false;

  if (isIpv4(normalized)) {
    const ipInt = ipv4ToInt(normalized);
    if (ipInt === null) return false;
    for (const entry of entries) {
      if (entry.includes("/")) {
        if (matchIpv4Cidr(ipInt, entry)) return true;
      } else if (entry === normalized) {
        return true;
      }
    }
    return false;
  }

  const ipBig = ipv6ToBigInt(normalized);
  if (ipBig === null) return false;
  for (const entry of entries) {
    if (entry.includes("/")) {
      if (matchIpv6Cidr(ipBig, entry)) return true;
    } else {
      const entryBig = ipv6ToBigInt(entry);
      if (entryBig !== null && entryBig === ipBig) return true;
    }
  }
  return false;
}

/**
 * Hoch-Level-Check für Server-Actions / Route-Handler.
 *
 *  - Wenn `enabled === false` → immer erlaubt (Feature aus).
 *  - Wenn `enabled === true` und Allowlist leer → wir **blocken nicht**, sondern
 *    geben einen klaren `enforced=false`-Hinweis zurück. Das vermeidet,
 *    dass ein User sich versehentlich aussperrt, wenn er den Toggle
 *    vor dem Eintragen seiner IP anschaltet.
 *  - Wenn `enabled === true` und Allowlist befüllt → echter Match.
 */
export type IpGuardResult =
  | { ok: true; reason: "disabled" | "match" | "allowlist_empty" }
  | { ok: false; reason: "no_client_ip" | "not_allowed"; clientIp: string | null };

export function checkClockIpAllowlist(params: {
  enabled: boolean;
  allowlist: string[];
  clientIp: string | null;
}): IpGuardResult {
  if (!params.enabled) return { ok: true, reason: "disabled" };
  if (params.allowlist.filter((s) => s.trim().length > 0).length === 0) {
    return { ok: true, reason: "allowlist_empty" };
  }
  if (!params.clientIp) return { ok: false, reason: "no_client_ip", clientIp: null };
  if (ipMatchesAllowlist(params.clientIp, params.allowlist)) {
    return { ok: true, reason: "match" };
  }
  return { ok: false, reason: "not_allowed", clientIp: params.clientIp };
}

/** Validiert einen Eintrag, bevor er in die DB geschrieben wird. */
export function validateAllowlistEntry(entry: string): { ok: true } | { ok: false; message: string } {
  const trimmed = entry.trim();
  if (!trimmed) return { ok: false, message: "Leer." };
  if (trimmed.length > 64) return { ok: false, message: "Maximal 64 Zeichen pro Eintrag." };

  if (trimmed.includes("/")) {
    const [base, bitsRaw] = trimmed.split("/");
    const bits = Number(bitsRaw);
    if (!Number.isInteger(bits)) return { ok: false, message: "CIDR-Maske ungültig." };
    if (isIpv4(base)) {
      if (bits < 0 || bits > 32) return { ok: false, message: "IPv4-CIDR muss 0–32 sein." };
      return { ok: true };
    }
    if (ipv6ToBigInt(base) !== null) {
      if (bits < 0 || bits > 128) return { ok: false, message: "IPv6-CIDR muss 0–128 sein." };
      return { ok: true };
    }
    return { ok: false, message: "CIDR-Basis ist keine gültige IP-Adresse." };
  }

  if (isIpv4(trimmed)) return { ok: true };
  if (ipv6ToBigInt(trimmed) !== null) return { ok: true };
  return { ok: false, message: "Weder gültige IPv4/IPv6 noch CIDR." };
}
