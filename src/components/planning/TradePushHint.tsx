"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

/**
 * Browser-Hinweis ergänzt die In-App-Glocke — keine Drittanbieter-Push-Dienste.
 */
export function TradePushHint() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setSupported(true);
    setPermission(Notification.permission);
  }, []);

  const requestPermission = async () => {
    if (!supported) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      try {
        new Notification("VREMA", {
          body: "Du erhältst System-Hinweise zu offenen Schichten — wichtige Infos weiterhin in der Glocke.",
        });
      } catch {
        /* Safari/iOS kann blockieren */
      }
    }
  };

  return (
    <div className="rounded-xl border border-line bg-surface/90 px-4 py-3 dark:border-white/10">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/12 text-brand">
          <Bell className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-semibold text-foreground">Benachrichtigung bei offenen Schichten</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Neue offene Schichten und Übernahme-Anfragen landen in der Glocke oben. Optional kannst du zusätzlich
            System-Benachrichtigen erlauben.
          </p>
          {supported ? (
            <button
              type="button"
              onClick={() => void requestPermission()}
              disabled={permission === "granted"}
              className="inline-flex min-h-10 items-center rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground disabled:opacity-60"
            >
              {permission === "granted"
                ? "System-Hinweise aktiv"
                : permission === "denied"
                  ? "Im Browser erlauben (Einstellungen)"
                  : "System-Hinweise erlauben"}
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">System-Push in diesem Browser nicht verfügbar — Glocke nutzen.</p>
          )}
        </div>
      </div>
    </div>
  );
}
