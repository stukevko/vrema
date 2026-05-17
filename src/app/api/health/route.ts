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
  result.push({ id: "api", label: "Plattform", state: "operational", latencyMs: 0 });

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
    hint: !(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET) ? "Anmeldung nicht vollständig eingerichtet" : undefined,
  });

  // Mail-Provider (Resend) konfiguriert?
  result.push({
    id: "mail",
    label: "E-Mail",
    state: process.env.RESEND_API_KEY ? "operational" : "degraded",
    hint: process.env.RESEND_API_KEY ? undefined : "E-Mail-Versand ist derzeit nicht eingerichtet",
  });

  // VREMA Native AI – Teil des Codes, kein externer Dienst, also IMMER aktiv.
  // Wir prüfen lediglich, ob die AiWeights-Tabelle reagiert (= Lern-Pfad intakt).
  try {
    const t0 = Date.now();
    await db.aiWeights.count();
    result.push({
      id: "native_ai",
      label: "Personal-Empfehlungen",
      state: "operational",
      latencyMs: Date.now() - t0,
    });
  } catch {
    result.push({
      id: "native_ai",
      label: "Personal-Empfehlungen",
      state: "degraded",
      hint: "Empfehlungen vorübergehend nur mit Standardwerten",
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
