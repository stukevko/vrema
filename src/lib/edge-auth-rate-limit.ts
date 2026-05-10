import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkMemRateLimit, clientIp } from "@/lib/edge-rate-limit";

/** Edge-only — keine DB/Prisma. Gibt 429 oder null (weiter). */
export function applyAuthRelatedRateLimits(req: NextRequest): NextResponse | null {
  const ip = clientIp(req);
  const path = req.nextUrl.pathname;
  const method = req.method;

  if (path === "/api/auth/register" && method === "POST") {
    if (!checkMemRateLimit(`auth:register:${ip}`, 8, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Zu viele Registrierungsversuche. Bitte in einigen Minuten erneut versuchen." },
        { status: 429, headers: { "Retry-After": "900" } },
      );
    }
  }

  if (path.startsWith("/api/auth/") && method === "POST" && path !== "/api/auth/register") {
    if (!checkMemRateLimit(`auth:post:${ip}`, 50, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte später erneut versuchen." },
        { status: 429, headers: { "Retry-After": "900" } },
      );
    }
  }

  if (path === "/api/auth/verify" && method === "GET") {
    if (!checkMemRateLimit(`auth:verify:${ip}`, 80, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte später erneut versuchen." },
        { status: 429, headers: { "Retry-After": "600" } },
      );
    }
  }

  if (path === "/api/public/affiliate-preview" && method === "GET") {
    if (!checkMemRateLimit(`aff:preview:${ip}`, 120, 60 * 1000)) {
      return NextResponse.json({ name: null }, { status: 429 });
    }
  }

  if (path.startsWith("/terminal/") && method === "POST") {
    if (!checkMemRateLimit(`terminal:${ip}`, 45, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Zu viele Stempelversuche. Bitte kurz warten." },
        { status: 429, headers: { "Retry-After": "300" } },
      );
    }
  }

  return null;
}
