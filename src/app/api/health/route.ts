import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAvailable as isOllamaAvailable } from "@/lib/ai/local-client";

/**
 *  GET /api/health
 *  Liefert einen leichtgewichtigen Health-Snapshot für /status.
 *  Wird intern und vom Frontend genutzt – kein Auth-Schutz, da rein lesend.
 */

type ComponentStatus = {
  id: "api" | "db" | "auth" | "mail" | "neural";
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

  // VREMA Neural Engine (Ollama lokal). Ist OPTIONAL – „degraded" statt „down".
  try {
    const t0 = Date.now();
    const neuralOk = await isOllamaAvailable();
    result.push({
      id: "neural",
      label: "VREMA Neural Engine",
      state: neuralOk ? "operational" : "degraded",
      latencyMs: Date.now() - t0,
      hint: neuralOk ? undefined : "Lokales Modell nicht erreichbar – Empfehlungen laufen im Heuristik-Modus.",
    });
  } catch {
    result.push({
      id: "neural",
      label: "VREMA Neural Engine",
      state: "degraded",
      hint: "Health-Check fehlgeschlagen – Heuristik-Fallback aktiv.",
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
