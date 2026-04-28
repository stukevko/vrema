import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Passkey/WebAuthn currently relies on database sessions.
 * Edge middleware cannot reliably validate those sessions without DB access,
 * so route protection is handled in Server Components / Actions instead.
 */
export default function proxy(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
