import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 *  GET /api/health
 *  Liefert einen leichtgewichtigen Health-Snapshot für /status.
 *  Wird intern und vom Frontend genutzt – kein Auth-Schutz, da rein lesend.
 */

type ComponentStatus = {
  id: "api" | "db" | "auth" | "mail" | "native_ai";
  label: string;
  state: "operational" | "degraded" | "down";
  latencyMs?: number;
  hint?: string;
};

export async function GET() {
  const start = Date.now();
  const result: ComponentStatus[] = [];

  // API selbst → wir sind hier, also operational.
  result.push({ id: "api", label: "API", state: "operational", latencyMs: 0 });

  // Datenbank → SELECT 1
  try {
    const t0 = Date.now();
    await db.$queryRaw`SELECT 1`;
    result.push({ id: "db", label: "Datenbank", state: "operational", latencyMs: Date.now() - t0 });
  } catch {
    result.push({ id: "db", label: "Datenbank", state: "down", hint: "DB-Verbindung gestört" });
  }

  // Auth-Konfig grob: NEXTAUTH_SECRET vorhanden?
  result.push({
    id: "auth",
    label: "Anmeldung",
    state: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET ? "operational" : "degraded",
    hint: !(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET) ? "Secret nicht gesetzt" : undefined,
  });

  // Mail-Provider (Resend) konfiguriert?
  result.push({
    id: "mail",
    label: "E-Mail",
    state: process.env.RESEND_API_KEY ? "operational" : "degraded",
    hint: process.env.RESEND_API_KEY ? undefined : "Resend nicht konfiguriert – Mails werden nicht versandt",
  });

  // VREMA Native AI – Teil des Codes, kein externer Dienst, also IMMER aktiv.
  // Wir prüfen lediglich, ob die AiWeights-Tabelle reagiert (= Lern-Pfad intakt).
  try {
    const t0 = Date.now();
    await db.aiWeights.count();
    result.push({
      id: "native_ai",
      label: "VREMA Native AI (Active)",
      state: "operational",
      latencyMs: Date.now() - t0,
    });
  } catch {
    result.push({
      id: "native_ai",
      label: "VREMA Native AI (Active)",
      state: "degraded",
      hint: "Lerntabelle nicht erreichbar – Empfehlungen laufen nur auf Live-Daten.",
    });
  }

  const totalLatency = Date.now() - start;
  const worst = result.some((c) => c.state === "down")
    ? "down"
    : result.some((c) => c.state === "degraded")
      ? "degraded"
      : "operational";

  return NextResponse.json(
    { status: worst, latencyMs: totalLatency, components: result, checkedAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
