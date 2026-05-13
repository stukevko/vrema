/**
 * Auth-Helper für die externe API.
 *
 *  - Liest `x-api-key` aus dem Request-Header.
 *  - Hasht den Klartext-Key zu SHA-256(hex).
 *  - Findet den DB-Datensatz; prüft Active/Expiry; updated `lastUsedAt` async.
 *
 *  Im Erfolgsfall liefert die Funktion `{ companyId, apiKeyId, scopes }`.
 *  Im Fehlerfall: `null` – der Aufrufer (Route-Handler) entscheidet selbst
 *  über die HTTP-Antwort (401, JSON-Schema etc.).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashApiKey, looksLikeApiKey, verifyHashConstantTime } from "@/lib/api/keys";

export type ApiKeyContext = {
  apiKeyId: string;
  companyId: string;
  scopes: string[];
};

export async function authenticateApiKey(req: NextRequest): Promise<ApiKeyContext | null> {
  const presented = req.headers.get("x-api-key")?.trim();
  if (!looksLikeApiKey(presented)) return null;

  const hashed = hashApiKey(presented);

  const record = await db.apiKey.findUnique({
    where: { hashedKey: hashed },
    select: {
      id: true,
      companyId: true,
      hashedKey: true,
      isActive: true,
      expiresAt: true,
      scopes: true,
    },
  });
  if (!record) return null;
  if (!record.isActive) return null;
  if (record.expiresAt && record.expiresAt < new Date()) return null;

  // Doppelte Sicherheits-Hürde, falls findUnique-Index je manipuliert würde:
  // explizite timing-safe Verifikation der Hashes.
  if (!verifyHashConstantTime(record.hashedKey, hashed)) return null;

  // Heartbeat ohne await – Audit darf den Hot-Path nicht ausbremsen.
  void db.apiKey
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {
      /* Audit-Failure ist non-fatal */
    });

  return { apiKeyId: record.id, companyId: record.companyId, scopes: record.scopes };
}

/**
 * Komfort-Wrapper: kapselt 401-JSON + Standard-Header.
 * Verwendung:
 *   export async function GET(req: NextRequest) {
 *     const ctx = await requireApiKey(req);
 *     if (ctx instanceof NextResponse) return ctx;
 *     // … geschäftslogik …
 *   }
 */
export async function requireApiKey(
  req: NextRequest,
  requiredScope?: string,
): Promise<ApiKeyContext | NextResponse> {
  const ctx = await authenticateApiKey(req);
  if (!ctx) {
    return unauthorized();
  }
  if (requiredScope && !ctx.scopes.includes(requiredScope)) {
    return forbidden("Scope fehlt für diese Operation.");
  }
  return ctx;
}

export function unauthorized(message = "Ungültiger oder fehlender API-Key.") {
  return NextResponse.json(
    { error: "unauthorized", message },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": 'ApiKey realm="VREMA External API"',
        "Cache-Control": "no-store",
      },
    },
  );
}

export function forbidden(message: string) {
  return NextResponse.json(
    { error: "forbidden", message },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}

export function jsonOk<T>(data: T, init: ResponseInit = {}) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-API-Version": "1",
      ...(init.headers ?? {}),
    },
  });
}
