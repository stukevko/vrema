import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runDataRetention } from "@/lib/data-retention";

export const runtime = "nodejs";

function isAuthorized(req: Request) {
  const expected = process.env.DATA_RETENTION_CRON_SECRET;
  if (!expected) return false;

  const headerSecret = req.headers.get("x-retention-secret");
  const bearer = req.headers.get("authorization");
  const bearerSecret = bearer?.startsWith("Bearer ") ? bearer.slice(7) : null;

  return headerSecret === expected || bearerSecret === expected;
}

async function run(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const report = await runDataRetention(db);
  return NextResponse.json({ ok: true, report });
}

export async function POST(req: Request) {
  return run(req);
}

export async function GET(req: Request) {
  return run(req);
}
