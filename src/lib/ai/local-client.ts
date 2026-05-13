/**
 * VREMA Neural Engine · Local LLM Client (Ollama)
 * ─────────────────────────────────────────────────
 * Provider-agnostischer HTTP-Client. Spricht heute Ollama
 * (http://localhost:11434), morgen LM Studio, vLLM oder ein
 * anderes lokales OpenAI-API-kompatibles Backend.
 *
 *   Zero-Dependency: nutzt fetch, kein SDK-Lock-in.
 *   Strict-Privacy: keine TLS-CA-Bypässe, kein implizites Logging.
 *   Graceful-Fallback: `isAvailable()` antwortet false → die UI
 *   zeigt heuristische Empfehlungen statt Crash.
 */

const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "mistral";

export type GenerateOptions = {
  /** Ollama-Modell, z. B. "mistral", "llama3", "qwen2.5". */
  model?: string;
  /** Niedrige Temperatur = deterministischer (gut für strukturierte Empfehlungen). */
  temperature?: number;
  /** Max. Antwort-Tokens. */
  maxTokens?: number;
  /** Timeout in ms. Wir kappen hart, damit Server-Actions nicht hängen. */
  timeoutMs?: number;
  /** JSON-Mode: erzwingt valide JSON-Antwort (Ollama-Feature). */
  jsonMode?: boolean;
};

export type GenerateResult = {
  ok: true;
  text: string;
  /** Wenn jsonMode: bereits geparstes Objekt. Sonst null. */
  json: unknown | null;
  modelTag: string;
  latencyMs: number;
};

export type GenerateError = {
  ok: false;
  reason: "unavailable" | "timeout" | "bad_response" | "invalid_json" | "internal";
  message: string;
};

function getOllamaUrl(): string {
  return process.env.OLLAMA_URL || DEFAULT_OLLAMA_URL;
}

function getDefaultModel(): string {
  return process.env.OLLAMA_MODEL || DEFAULT_MODEL;
}

/**
 *  Health-Check: ist die lokale Ollama-Instanz erreichbar?
 *  Wir nutzen `/api/tags` als leichter Probe-Call.
 */
export async function isAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${getOllamaUrl()}/api/tags`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 *  Single-Shot-Generation. Kein Streaming – Server-Actions sollen
 *  vorhersagbar antworten, nicht halb-fertige Texte ausspucken.
 */
export async function generate(
  systemPrompt: string,
  userPrompt: string,
  opts: GenerateOptions = {},
): Promise<GenerateResult | GenerateError> {
  const start = Date.now();
  const model = opts.model || getDefaultModel();
  const url = `${getOllamaUrl()}/api/chat`;
  const timeoutMs = opts.timeoutMs ?? 25_000;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        format: opts.jsonMode ? "json" : undefined,
        options: {
          temperature: opts.temperature ?? 0.2,
          num_predict: opts.maxTokens ?? 512,
        },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    clearTimeout(t);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        reason: "bad_response",
        message: `Ollama antwortete mit HTTP ${res.status}: ${body.slice(0, 200)}`,
      };
    }

    const data = (await res.json()) as { message?: { content?: string }; done?: boolean };
    const text = data?.message?.content?.trim() ?? "";
    if (!text) {
      return { ok: false, reason: "bad_response", message: "Leere Antwort vom Modell." };
    }

    let json: unknown = null;
    if (opts.jsonMode) {
      try {
        json = JSON.parse(text);
      } catch {
        return {
          ok: false,
          reason: "invalid_json",
          message: "Modell hat JSON-Mode angefordert, aber kein valides JSON geliefert.",
        };
      }
    }

    return {
      ok: true,
      text,
      json,
      modelTag: `ollama:${model}`,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("aborted") || msg.toLowerCase().includes("timeout")) {
      return { ok: false, reason: "timeout", message: `Modell-Timeout nach ${timeoutMs}ms.` };
    }
    // ECONNREFUSED, fetch failed etc. → behandeln als „nicht verfügbar".
    if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed") || msg.includes("ENOTFOUND")) {
      return { ok: false, reason: "unavailable", message: "Lokales Modell nicht erreichbar." };
    }
    return { ok: false, reason: "internal", message: msg };
  }
}
