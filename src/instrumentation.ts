/**
 * Next.js 15+/16 Instrumentation Hook.
 *
 * Wird beim Server-Boot einmal initialisiert und danach ruft Next bei JEDEM
 * Server-Side-Error (RSC-Render, Server Action, Route Handler, Middleware)
 * `onRequestError` mit dem ECHTEN Stack auf – auch in Production, wo der Browser
 * sonst nur `digest: 'xxx'` zu sehen bekommt.
 *
 * → Damit ersetzen wir endgültig das „omitted in production builds"-Rätselraten.
 *
 * Doku: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
export async function register(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log("[vrema:instrumentation] registered – server-side error reporting active");
}

type ErrorContext = {
  routerKind: "Pages Router" | "App Router";
  routePath: string;
  routeType: "render" | "route" | "action" | "middleware";
  renderSource?: "react-server-components" | "react-server-components-payload" | "server-rendering";
  revalidateReason?: "on-demand" | "stale" | undefined;
};

type RequestInfo = {
  path: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
};

export const onRequestError = async (
  err: unknown,
  request: RequestInfo,
  errorContext: ErrorContext,
): Promise<void> => {
  const e = err as (Error & { digest?: string }) | null;
  const payload = {
    level: "error",
    scope: "vrema:onRequestError",
    digest: e?.digest ?? null,
    name: e?.name ?? "UnknownError",
    message: e?.message ?? String(err),
    stack: e?.stack ?? null,
    request: {
      path: request.path,
      method: request.method,
      // Nur das was hilft – kein Cookie/Auth-Header in den Logs.
      userAgent: typeof request.headers["user-agent"] === "string"
        ? request.headers["user-agent"]
        : undefined,
    },
    context: errorContext,
  };
  // eslint-disable-next-line no-console
  console.error("[vrema:onRequestError]", JSON.stringify(payload));
};
