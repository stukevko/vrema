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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
