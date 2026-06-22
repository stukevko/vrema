import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { AbsenceType } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ requestId: string }> },
) {
  const session = await auth();
  const role = session?.user?.role ?? "EMPLOYEE";
  const companyId = session?.user?.companyId;
  if (!companyId || !["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const { requestId } = await ctx.params;
  const row = await db.vacationRequest.findFirst({
    where: tenantWhere(companyId, { id: requestId, absenceType: AbsenceType.SICK }),
    select: {
      sickAttachmentMime: true,
      sickAttachmentData: true,
      sickAttachmentRetainUntil: true,
    },
  });

  if (!row?.sickAttachmentMime || !row.sickAttachmentData) {
    return NextResponse.json({ error: "Kein Anhang." }, { status: 404 });
  }

  if (row.sickAttachmentRetainUntil && row.sickAttachmentRetainUntil < new Date()) {
    return NextResponse.json({ error: "Aufbewahrungsfrist abgelaufen." }, { status: 410 });
  }

  const match = row.sickAttachmentData.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return NextResponse.json({ error: "Ungültiger Anhang." }, { status: 500 });
  }

  const mime = match[1]!;
  const base64 = match[2]!;
  const body = Buffer.from(base64, "base64");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `inline; filename="au-nachweis.${mime === "application/pdf" ? "pdf" : "jpg"}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
