import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const baseUrl = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(new URL("/auth/login?error=invalid_verification", baseUrl));
  }

  const verification = await db.verificationToken.findUnique({
    where: { token },
  });

  if (!verification) {
    return NextResponse.redirect(new URL("/auth/login?error=invalid_verification", baseUrl));
  }

  if (!verification.identifier.startsWith("verify:")) {
    await db.verificationToken.delete({ where: { token } });
    return NextResponse.redirect(new URL("/auth/login?error=invalid_verification", baseUrl));
  }

  if (verification.expires < new Date()) {
    await db.verificationToken.delete({ where: { token } });
    return NextResponse.redirect(new URL("/auth/login?error=expired_verification", baseUrl));
  }

  const email = verification.identifier.replace("verify:", "");
  await db.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });

  await db.verificationToken.delete({ where: { token } });

  return NextResponse.redirect(new URL("/setup?verified=1", baseUrl));
}
