/**
 * Tiny structured logger für Server-Komponenten / Server Actions.
 *
 * Warum: In Production-Builds versteckt React 19 / Next 15 die echte Fehler-Message.
 * Mit `logServerError("dashboard.activeShiftTasks", err)` sehen wir auf der VM zumindest
 * im stdout/Datadog SOFORT, was geknallt hat – ohne Source-Maps zu brauchen.
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
}
