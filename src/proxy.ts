import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { applyAuthRelatedRateLimits } from "@/lib/edge-auth-rate-limit";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const rateLimited = applyAuthRelatedRateLimits(req);
  if (rateLimited) return rateLimited;

  const role = req.auth?.user?.role;
  if (role === "EMPLOYEE") {
    const pathname = req.nextUrl.pathname;

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

  return NextResponse.next();
});

export const config = {
  // Performance: Wir matchen NUR Pfade, die wir tatsächlich brauchen.
  //   - /dashboard/* für Rollen-Redirects
  //   - /api/auth/*, /api/public/affiliate-preview, /terminal/* für Rate-Limits
  // Statische Dateien (_next, favicon, manifest.json, sw.js, offline.html, Icons, Robots …)
  // werden gar nicht erst durch die Edge-Middleware geschickt → keine JWT-Decodes pro Asset.
  matcher: [
    "/dashboard/:path*",
    "/api/auth/:path*",
    "/api/public/affiliate-preview",
    "/terminal/:path*",
  ],
};
