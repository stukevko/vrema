"use client";

import { useEffect } from "react";

/**
 * Globaler Fallback für Fehler, die das Root-Layout selbst betreffen.
 *
 * Hinweis: `global-error` ersetzt das Root-Layout komplett und rendert
 * deshalb ein eigenes <html>/<body>. Da hier weder Provider noch das
 * globale Stylesheet garantiert geladen sind, nutzen wir bewusst
 * Inline-Styles, damit die Seite IMMER sauber aussieht.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          background: "#0a3a52",
          color: "#f8fafc",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "28rem",
            textAlign: "center",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: "1.25rem",
            padding: "2.5rem 1.75rem",
          }}
        >
          <div
            style={{
              fontSize: "2.25rem",
              lineHeight: 1,
              marginBottom: "1rem",
            }}
            aria-hidden
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
            Etwas ist schiefgelaufen
          </h1>
          <p style={{ fontSize: "0.9rem", opacity: 0.85, margin: "0 0 1.5rem" }}>
            Die App konnte nicht geladen werden. Bitte versuche es erneut. Wenn das Problem
            bestehen bleibt, lade die Seite neu oder melde dich beim Support.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              minHeight: "3rem",
              width: "100%",
              borderRadius: "0.9rem",
              border: "none",
              background: "#f8fafc",
              color: "#0a3a52",
              fontSize: "0.9rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Erneut versuchen
          </button>
          {error.digest ? (
            <p style={{ fontSize: "0.7rem", opacity: 0.55, marginTop: "1rem" }}>
              Fehler-Code: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
