import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAbsentEntriesForMissingShifts } from "@/lib/attendance";

export const runtime = "nodejs";

function isAuthorized(req: Request) {
  const expected = process.env.ABSENT_CRON_SECRET ?? process.env.DATA_RETENTION_CRON_SECRET;
  if (!expected) return false;

  const headerSecret = req.headers.get("x-absent-secret");
  const bearer = req.headers.get("authorization");
  const bearerSecret = bearer?.startsWith("Bearer ") ? bearer.slice(7) : null;

  return headerSecret === expected || bearerSecret === expected;
}

async function run(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await createAbsentEntriesForMissingShifts(db);
    return NextResponse.json({ ok: true, report });
  } catch (err) {
    console.error("[cron:mark-absent] failed:", err);
    return NextResponse.json({ ok: false, error: "Job fehlgeschlagen." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
