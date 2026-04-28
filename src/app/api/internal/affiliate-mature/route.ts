import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runMatureAffiliateEarnings } from "@/lib/affiliate-earnings";

export const runtime = "nodejs";

function cronSecret() {
  return (
    process.env.AFFILIATE_MATURATION_CRON_SECRET ??
    process.env.DATA_RETENTION_CRON_SECRET ??
    ""
  );
}

function isAuthorized(req: Request) {
  const expected = cronSecret();
  if (!expected) return false;

  const headerSecret = req.headers.get("x-affiliate-mature-secret");
  const bearer = req.headers.get("authorization");
  const bearerSecret = bearer?.startsWith("Bearer ") ? bearer.slice(7) : null;

  return headerSecret === expected || bearerSecret === expected;
}

async function run(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const report = await runMatureAffiliateEarnings(db);
  return NextResponse.json({ ok: true, report });
}

export async function POST(req: Request) {
  return run(req);
}

export async function GET(req: Request) {
  return run(req);
}
