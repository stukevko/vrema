import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { applyAuthRelatedRateLimits } from "@/lib/edge-auth-rate-limit";

const { auth } = NextAuth(authConfig);

function nextWithPathname(req: { headers: Headers; nextUrl: { pathname: string } }) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export default auth((req) => {
  const rateLimited = applyAuthRelatedRateLimits(req);
  if (rateLimited) return rateLimited;

  const pathname = req.nextUrl.pathname;

  /** Flyer-Tippfehler: /ref=speyer → /auth/register?ref=speyer */
  const malformedRef = pathname.match(/^\/ref=([a-zA-Z0-9][a-zA-Z0-9_-]{0,79})\/?$/i);
  if (malformedRef) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/register";
    url.search = "";
    url.searchParams.set("ref", malformedRef[1]!.toLowerCase());
    return NextResponse.redirect(url, 308);
  }

  const role = req.auth?.user?.role;

  if (role === "ADVISOR") {
    const allowed =
      pathname.startsWith("/dashboard/peaks") ||
      pathname.startsWith("/dashboard/account") ||
      pathname.startsWith("/dashboard/trial-ended");
    if (!allowed && pathname.startsWith("/dashboard")) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard/peaks";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (role === "EMPLOYEE") {

    if (pathname === "/dashboard/settings" || pathname.startsWith("/dashboard/settings/")) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard/account";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (pathname === "/dashboard/reports" || pathname.startsWith("/dashboard/reports/")) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (pathname === "/dashboard/billing" || pathname.startsWith("/dashboard/billing/")) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return nextWithPathname(req);
});

export const config = {
  // Performance: Wir matchen NUR Pfade, die wir tatsächlich brauchen.
  //   - /dashboard/* für Rollen-Redirects
  //   - /api/auth/*, /api/public/affiliate-preview, /terminal/* für Rate-Limits
  //   - /ref=code für Flyer-QR-Tippfehler
  // Statische Dateien (_next, favicon, manifest.json, sw.js, offline.html, Icons, Robots …)
  // werden gar nicht erst durch die Edge-Middleware geschickt → keine JWT-Decodes pro Asset.
  matcher: [
    "/dashboard/:path*",
    "/api/auth/:path*",
    "/api/public/affiliate-preview",
    "/terminal/:path*",
    "/ref=:code*",
  ],
};
