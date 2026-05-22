import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { deletePlannerShiftCore } from "@/lib/planning/delete-shift-core";
import { logServerError } from "@/lib/server-logger";

const MANAGER_ROLES = new Set(["COMPANY_OWNER", "MANAGER", "SUPER_ADMIN"]);

export async function POST(req: Request) {
  try {
    const session = await auth();
    const companyId = session?.user?.companyId;
    const role = session?.user?.role;
    if (!session?.user?.id || !companyId) {
      return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
    }
    if (!role || !MANAGER_ROLES.has(role)) {
      return NextResponse.json({ ok: false, error: "Keine Berechtigung." }, { status: 403 });
    }

    const body = (await req.json()) as { shiftId?: unknown };
    const shiftId = typeof body.shiftId === "string" ? body.shiftId.trim() : "";
    if (!shiftId) {
      return NextResponse.json({ ok: false, error: "Ungültige Schicht-Referenz." }, { status: 400 });
    }

    const count = await deletePlannerShiftCore(companyId, shiftId);
    if (count === 0) {
      return NextResponse.json(
        { ok: false, error: "Schicht nicht gefunden — bitte Seite neu laden." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logServerError("api.planning.remove-shift", err);
    return NextResponse.json(
      { ok: false, error: "Schicht konnte nicht entfernt werden. Bitte erneut versuchen." },
      { status: 500 },
    );
  }
}
