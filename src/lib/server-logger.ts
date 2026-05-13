/**
 * Tiny structured logger für Server-Komponenten / Server Actions.
 *
 * Warum: In Production-Builds versteckt React 19 / Next 15 die echte Fehler-Message.
 * Mit `logServerError("dashboard.activeShiftTasks", err)` sehen wir auf der VM zumindest
 * im stdout/Datadog SOFORT, was geknallt hat – ohne Source-Maps zu brauchen.
 *
 *  Sentry-Stub: wenn `SENTRY_DSN` gesetzt ist, schicken wir den Fehler zusätzlich an
 *  Sentry per leichtem fetch-Aufruf (Tunnel-Endpoint). Das vermeidet einen schweren
 *  Sentry-SDK-Dependency-Tree und hält Cold-Starts klein. Für richtigen Stack-Trace-
 *  Replay genügt das Frontend-SDK; serverseitig reicht der reine Error-Capture.
 */
export function logServerError(scope: string, err: unknown, extra?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "test") return;
  const payload = {
    level: "error",
    scope,
    message: err instanceof Error ? err.message : String(err),
    name: err instanceof Error ? err.name : undefined,
    stack: err instanceof Error ? err.stack : undefined,
    ...extra,
  };
  // eslint-disable-next-line no-console
  console.error(`[vrema] ${scope}`, payload);

  // Optionaler Sentry-Forward — nur aktiv, wenn DSN gesetzt ist.
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  try {
    const url = buildSentryStoreUrl(dsn);
    if (!url) return;
    // Fire-and-forget. Wir ignorieren Errors absichtlich.
    void fetch(url.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${url.publicKey}, sentry_client=vrema/0.1`,
      },
      body: JSON.stringify({
        message: payload.message,
        level: "error",
        platform: "node",
        environment: process.env.NODE_ENV,
        release: process.env.SENTRY_RELEASE,
        tags: { scope },
        extra: extra ?? {},
        exception: payload.stack
          ? { values: [{ type: payload.name ?? "Error", value: payload.message, stacktrace: { frames: [{ filename: "<server>" }] } }] }
          : undefined,
      }),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

function buildSentryStoreUrl(dsn: string): { endpoint: string; publicKey: string } | null {
  // DSN-Form: https://<publicKey>@<host>/<projectId>
  try {
    const u = new URL(dsn);
    const publicKey = u.username;
    const projectId = u.pathname.replace(/^\//, "");
    if (!publicKey || !projectId) return null;
    return { endpoint: `${u.protocol}//${u.host}/api/${projectId}/store/`, publicKey };
  } catch {
    return null;
  }
}
