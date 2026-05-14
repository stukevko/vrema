"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

/**
 * Hinweis: echte Web-Push-Anbindung (VAPID, Service Worker) folgt separat.
 * Bis dahin: In-App-Glocke + optional System-Berechtigung vorbereiten.
 */
export function TradePushHint() {
  const [canNotify, setCanNotify] = useState(false);

  useEffect(() => {
    setCanNotify(typeof window !== "undefined" && "Notification" in window);
  }, []);

  return (
    <div className="rounded-xl border border-line bg-surface/90 px-4 py-3 dark:border-white/10">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/12 text-brand">
          <Bell className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-semibold text-foreground">Benachrichtigung bei Tausch</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Tausch-Anfragen siehst du sofort in der App über die Glocke oben. Browser-Push für Tausche ohne
            Drittanbieter-Tracking bereiten wir als nächsten Schritt vor – dann kannst du hier einmalig erlauben.
          </p>
          <button
            type="button"
            disabled
            className="inline-flex min-h-10 items-center rounded-lg border border-border bg-muted/50 px-3 text-xs font-semibold text-muted-foreground"
            title="Funktion in Vorbereitung"
          >
            {canNotify ? "Browser-Push (demnächst)" : "Browser-Push nicht verfügbar"}
          </button>
        </div>
      </div>
    </div>
  );
}
