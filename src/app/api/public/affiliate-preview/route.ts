import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { flyerReferralDisplayName, isFlyerReferralCode } from "@/lib/trial/referral";

/** Öffentlich: Anzeigename für Ref-Code (Registrierung / LocalStorage), ohne Secrets. */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("code")?.trim().toLowerCase() ?? "";
  if (!raw || raw.length > 64) {
    return NextResponse.json({ name: null, flyer: false, label: null }, { status: 400 });
  }

  if (isFlyerReferralCode(raw)) {
    return NextResponse.json({
      name: null,
      flyer: true,
      label: flyerReferralDisplayName(raw),
    });
  }

  const aff = await db.affiliate.findUnique({
    where: { code: raw },
    select: { name: true },
  });

  return NextResponse.json({
    name: aff?.name ?? null,
    flyer: false,
    label: null,
  });
}
