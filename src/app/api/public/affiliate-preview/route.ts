import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Öffentlich: Anzeigename für Ref-Code (Registrierung / LocalStorage), ohne Secrets. */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("code")?.trim().toLowerCase() ?? "";
  if (!raw || raw.length > 64) {
    return NextResponse.json({ name: null }, { status: 400 });
  }

  const aff = await db.affiliate.findUnique({
    where: { code: raw },
    select: { name: true },
  });

  return NextResponse.json({ name: aff?.name ?? null });
}
