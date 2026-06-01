import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logServerError } from "@/lib/server-logger";

export const runtime = "nodejs";

/** Entfernt das Push-Abo eines Geräts (User deaktiviert Benachrichtigungen). */
export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
    }

    const endpoint =
      typeof (payload as { endpoint?: unknown })?.endpoint === "string"
        ? (payload as { endpoint: string }).endpoint.trim()
        : "";

    if (!endpoint) {
      return NextResponse.json({ ok: false, error: "Endpoint fehlt." }, { status: 400 });
    }

    // Scope auf den eigenen User – fremde Abos können nicht gelöscht werden.
    await db.pushSubscription.deleteMany({ where: { endpoint, userId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logServerError("api.push.unsubscribe", err);
    return NextResponse.json(
      { ok: false, error: "Push-Abo konnte nicht entfernt werden." },
      { status: 500 },
    );
  }
}
