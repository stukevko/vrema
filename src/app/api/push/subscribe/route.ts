import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logServerError } from "@/lib/server-logger";

export const runtime = "nodejs";

/**
 * Speichert die Web-Push-Subscription des aktuellen Geräts für den eingeloggten
 * User. Existiert der Endpoint bereits (z. B. nach erneutem Abo), wird der
 * Datensatz aktualisiert statt dupliziert.
 */
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

    const sub = payload as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
    const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint.trim() : "";
    const p256dh = typeof sub?.keys?.p256dh === "string" ? sub.keys.p256dh : "";
    const authKey = typeof sub?.keys?.auth === "string" ? sub.keys.auth : "";

    if (!endpoint || !p256dh || !authKey) {
      return NextResponse.json(
        { ok: false, error: "Ungültige Push-Subscription." },
        { status: 400 },
      );
    }

    await db.pushSubscription.upsert({
      where: { endpoint },
      update: { userId, p256dh, auth: authKey },
      create: { userId, endpoint, p256dh, auth: authKey },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logServerError("api.push.subscribe", err);
    return NextResponse.json(
      { ok: false, error: "Push-Abo konnte nicht gespeichert werden." },
      { status: 500 },
    );
  }
}
