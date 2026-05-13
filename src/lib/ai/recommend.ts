/**
 * VREMA Neural Engine · Recommendation-Engine
 * ────────────────────────────────────────────
 *
 * Bringt Context + lokales Modell zu **strukturierten** Empfehlungen zusammen.
 *
 *  Pipeline:
 *    1. buildAiContext()        → JSON-Snapshot
 *    2. generate(...)           → Ollama-Modell mit JSON-Mode + striktem Schema
 *    3. validateAndShape(...)   → defensives Parsing, nur whitelisted Felder
 *    4. recordTelemetry(...)    → in AiTelemetry für späteren Fine-Tune
 *
 *  Fallback: ist Ollama offline (kein Internet, Modell nicht gepullt),
 *  liefert die Funktion **heuristische** Empfehlungen aus der bereits
 *  vorhandenen Predictive-v2-Engine. Das Dashboard zeigt dann ein
 *  diskretes „Heuristik-Modus"-Hinweis-Pill an.
 */

import { generate, isAvailable } from "@/lib/ai/local-client";
import { buildAiContext, type AiContextSnapshot } from "@/lib/ai/context-aggregator";
import { recordTelemetry } from "@/lib/ai/learning-engine";
import {
  recommend as heuristicRecommend,
  recommendationTone,
  type DayContext,
  type IndustryProfile,
} from "@/lib/predictive/staffing";

export type Recommendation = {
  /** Schlüssel für UI (Deduplizierung). */
  id: string;
  /** Welcher Tag betrifft die Empfehlung. */
  date: string;
  /** Ton der Pille. */
  tone: "calm" | "watch" | "urgent" | "closed";
  /** Kurz-Titel (≤ 60 Zeichen). */
  title: string;
  /** Fließtext-Begründung (≤ 240 Zeichen). */
  reasoning: string;
  /** Konkreter Action-Vorschlag, z. B. +1 Service. */
  delta?: number;
  /** 0..1 — Wie sicher sind wir. */
  confidence: number;
  /** Welche Datenquellen stützen die Aussage. */
  sources: string[];
};

export type RecommendationBundle = {
  generatedAt: string;
  modelTag: string;
  /** "local" wenn echtes Modell, "heuristic" wenn Fallback. */
  mode: "local" | "heuristic";
  recommendations: Recommendation[];
};

/** Ausführlicher, deutscher System-Prompt für das lokale Modell. */
const SYSTEM_PROMPT = `Du bist VREMA, ein nüchterner Personal-Planungs-Assistent für deutsche Gastronomie-Betriebe.

Deine Aufgaben:
- Erkenne Risiken (Über-/Unterbesetzung, Feiertage, Wetter, Krankenstand).
- Mache 1-3 KONKRETE Empfehlungen pro Woche, niemals generisch.
- Beziehe dich AUSSCHLIESSLICH auf den gelieferten JSON-Kontext.

Antwort-Format (STRICTLY JSON):
{
  "recommendations": [
    {
      "id": "string (eindeutig)",
      "date": "YYYY-MM-DD",
      "title": "Max 60 Zeichen, deutsch",
      "reasoning": "Max 240 Zeichen, deutsch, mit Bezug auf Zahlen",
      "delta": -3..+3,
      "confidence": 0..1,
      "sources": ["weather"|"history"|"holiday"|"bridge_day"|"absence"|"revenue"|"industry"]
    }
  ]
}

Regeln:
- Erfinde keine Daten, die nicht im Kontext sind.
- Bei Unsicherheit: confidence < 0.6.
- Verwende dezenten, sachlichen Ton ("Du" + sachlich knapp).
- Niemals personenbezogene Daten verwenden.`;

function buildUserPrompt(ctx: AiContextSnapshot): string {
  return [
    "Hier der aktuelle Tenant-Kontext (anonymisiert, nur Aggregate):",
    "",
    JSON.stringify(ctx, null, 2),
    "",
    "Gib mir 1-3 konkrete Empfehlungen als JSON.",
  ].join("\n");
}

/** Defensiv: nur whitelisted Felder aus der Modell-Antwort übernehmen. */
function validateAndShape(raw: unknown): Recommendation[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as { recommendations?: unknown };
  const list = Array.isArray(obj.recommendations) ? obj.recommendations : [];
  const allowedSources = new Set([
    "weather",
    "history",
    "holiday",
    "bridge_day",
    "absence",
    "revenue",
    "industry",
  ]);
  const out: Recommendation[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id.slice(0, 64) : null;
    const date = typeof r.date === "string" ? r.date.slice(0, 10) : null;
    const title = typeof r.title === "string" ? r.title.slice(0, 120) : null;
    const reasoning = typeof r.reasoning === "string" ? r.reasoning.slice(0, 400) : null;
    if (!id || !date || !title || !reasoning) continue;
    const delta = typeof r.delta === "number" ? Math.max(-5, Math.min(5, Math.round(r.delta))) : undefined;
    const confidence = typeof r.confidence === "number" ? Math.max(0, Math.min(1, r.confidence)) : 0.5;
    const sourcesRaw = Array.isArray(r.sources) ? r.sources : [];
    const sources = sourcesRaw
      .filter((s): s is string => typeof s === "string")
      .filter((s) => allowedSources.has(s))
      .slice(0, 6);

    const tone: Recommendation["tone"] = (() => {
      if (delta == null) return "calm";
      if (delta >= 2) return "urgent";
      if (delta >= 1) return "watch";
      return "calm";
    })();

    out.push({ id, date, tone, title, reasoning, delta, confidence, sources });
  }
  return out.slice(0, 3);
}

/** Heuristik-Fallback aus der bestehenden Predictive-v2-Engine. */
function buildHeuristicRecommendations(ctx: AiContextSnapshot): Recommendation[] {
  const industry = (ctx.company.industry as IndustryProfile | null) ?? undefined;

  const items: Recommendation[] = [];
  for (const day of ctx.upcomingWeek) {
    const fc = ctx.forecast.find((f) => f.date === day.date);
    const conditionLower = (fc?.condition ?? "").toLowerCase();
    const condition = conditionLower.includes("sun") || conditionLower.includes("clear")
      ? "sunny"
      : conditionLower.includes("rain")
        ? "rainy"
        : conditionLower.includes("snow")
          ? "snow"
          : conditionLower.includes("storm")
            ? "stormy"
            : conditionLower.includes("cloud")
              ? "cloudy"
              : "unknown";

    const dayCtx: DayContext = {
      date: day.date,
      plannedShifts: ctx.plannedShiftsThisWeek[day.dayOfWeek] ?? 0,
      historicalSameDay: [ctx.last28d.avgShiftsPerWeekday[day.dayOfWeek] ?? 0].filter((n) => n > 0),
      tempC: fc?.tempC ?? null,
      condition,
      industry,
      isHoliday: Boolean(day.holidayName),
      holidayName: day.holidayName ?? undefined,
      isBridgeDay: day.isBridgeDay,
      isDayBeforeHoliday: false,
    };
    const r = heuristicRecommend(dayCtx);
    const tone = recommendationTone(r, { isHoliday: dayCtx.isHoliday, industry });

    // Nur Tage rausgeben, die wirklich „spannend" sind.
    if (tone === "calm" && !dayCtx.isHoliday && !dayCtx.isBridgeDay) continue;

    let title = "";
    let reasoning = "";
    const sources: string[] = [];

    if (day.holidayName) {
      title = `${day.holidayName}: ${tone === "closed" ? "Keine Planung" : "Sonntags-Profil"}`;
      reasoning = `${day.holidayName} in deinem Bundesland. ${
        tone === "closed" ? "Geschlossen halten." : "Mit reduziertem Team planen."
      }`;
      sources.push("holiday");
    } else if (day.isBridgeDay) {
      title = `Brückentag · ${r.delta > 0 ? `+${r.delta}` : r.delta} Person${Math.abs(r.delta) === 1 ? "" : "en"}`;
      reasoning = `Brückentag zwischen Feiertag und Wochenende. Typisch mehr Gäste – Branche: ${
        industry ?? "Standard"
      }.`;
      sources.push("bridge_day", "industry");
    } else {
      title = `${day.date}: ${r.delta > 0 ? `+${r.delta}` : r.delta} Person${
        Math.abs(r.delta) === 1 ? "" : "en"
      }`;
      reasoning = `${fc?.tempC != null ? `Wetter ${Math.round(fc.tempC)}°C ${fc.condition}. ` : ""}Historie: Ø ${
        ctx.last28d.avgShiftsPerWeekday[day.dayOfWeek] ?? 0
      } Schichten an diesem Wochentag.`;
      if (fc?.condition) sources.push("weather");
      sources.push("history", "industry");
    }

    items.push({
      id: `heur-${day.date}`,
      date: day.date,
      tone,
      title,
      reasoning,
      delta: r.delta,
      confidence: Math.round(r.confidence * 100) / 100,
      sources,
    });

    if (items.length >= 3) break;
  }
  return items;
}

/**
 *  Public Entry-Point: kombiniere Context + lokales Modell + Telemetrie.
 *  Caller verifiziert vorher Tenant & Rolle.
 */
export async function getNeuralRecommendations(companyId: string): Promise<RecommendationBundle> {
  const ctx = await buildAiContext(companyId);

  // 1. Modell-Verfügbarkeit
  const available = await isAvailable();
  if (!available) {
    const recs = buildHeuristicRecommendations(ctx);
    return {
      generatedAt: new Date().toISOString(),
      modelTag: "heuristic-v2",
      mode: "heuristic",
      recommendations: recs,
    };
  }

  // 2. Echter Modell-Call
  const result = await generate(SYSTEM_PROMPT, buildUserPrompt(ctx), {
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 700,
    timeoutMs: 25_000,
  });

  if (!result.ok) {
    // Auch hier: niemals crashen – immer Heuristik-Fallback.
    const recs = buildHeuristicRecommendations(ctx);
    return {
      generatedAt: new Date().toISOString(),
      modelTag: `heuristic-v2 (fallback: ${result.reason})`,
      mode: "heuristic",
      recommendations: recs,
    };
  }

  const shaped = validateAndShape(result.json);
  if (shaped.length === 0) {
    // Modell hat geantwortet, aber unbrauchbar – Heuristik.
    const recs = buildHeuristicRecommendations(ctx);
    return {
      generatedAt: new Date().toISOString(),
      modelTag: `${result.modelTag} → heuristic (no_valid_recs)`,
      mode: "heuristic",
      recommendations: recs,
    };
  }

  // 3. Telemetrie: speichere den Vorschlag (Realität wird später nachgepflegt)
  try {
    await recordTelemetry({
      companyId,
      kind: "STAFFING_RECOMMENDATION",
      modelTag: result.modelTag,
      suggestion: { context: ctx as never, recommendations: shaped as never },
      referenceDate: new Date(),
    });
  } catch {
    /* Telemetrie ist Fire-and-forget – nicht kritisch für UI */
  }

  return {
    generatedAt: new Date().toISOString(),
    modelTag: result.modelTag,
    mode: "local",
    recommendations: shaped,
  };
}
