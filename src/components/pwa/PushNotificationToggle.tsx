"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import {
  hasActivePushSubscription,
  isPushSupported,
  pushPermission,
  setAppBadge,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push/client";

type Status = "loading" | "unsupported" | "on" | "off" | "busy";

/**
 * Persistentes Push-Toggle (Account-Einstellungen).
 *
 * Journey: User sieht beim Laden, ob Push auf DIESEM Gerät aktiv ist, und
 * kann es mit einem Tap an-/abschalten. Blockiert der Browser den Prompt,
 * gibt es einen klaren Hinweis statt einer toten Schaltfläche.
 */
export function PushNotificationToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [denied, setDenied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isPushSupported()) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      const active = await hasActivePushSubscription();
      if (cancelled) return;
      setDenied(pushPermission() === "denied");
      setStatus(active ? "on" : "off");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = async () => {
    setStatus("busy");
    setMessage(null);
    try {
      const ok = await subscribeToPush(true);
      if (ok) {
        setStatus("on");
        setDenied(false);
        setMessage("Push-Benachrichtigungen aktiviert.");
        return;
      }
      // Nicht erfolgreich → meist blockierte Permission.
      if (pushPermission() === "denied") {
        setDenied(true);
        setMessage(
          "Benachrichtigungen sind im Browser blockiert. Bitte in den Website-Einstellungen (Schloss-Symbol neben der Adresse) erlauben.",
        );
      } else {
        setMessage("Aktivierung nicht abgeschlossen. Bitte erneut versuchen.");
      }
      setStatus("off");
    } catch {
      setStatus("off");
      setMessage("Aktivierung fehlgeschlagen. Bitte erneut versuchen.");
    }
  };

  const disable = async () => {
    setStatus("busy");
    setMessage(null);
    try {
      await unsubscribeFromPush();
      setAppBadge(0);
      setStatus("off");
      setMessage("Push-Benachrichtigungen deaktiviert.");
    } catch {
      setStatus("on");
      setMessage("Deaktivierung fehlgeschlagen. Bitte erneut versuchen.");
    }
  };

  if (status === "unsupported") {
    return (
      <p className="text-sm text-muted-foreground">
        Push wird in diesem Browser nicht unterstützt. Wichtige Hinweise findest du weiterhin in
        der Glocke oben.
      </p>
    );
  }

  const isOn = status === "on";
  const busy = status === "busy" || status === "loading";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              isOn ? "bg-brand/12 text-brand" : "bg-muted text-muted-foreground"
            }`}
          >
            {isOn ? <Bell className="h-4 w-4" aria-hidden /> : <BellOff className="h-4 w-4" aria-hidden />}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Push-Benachrichtigungen</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Plan-Änderungen, Tausch-Anfragen & Freigaben direkt aufs Handy — auch wenn die App
              geschlossen ist.
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={isOn}
          aria-label="Push-Benachrichtigungen umschalten"
          disabled={busy}
          onClick={() => (isOn ? void disable() : void enable())}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
            isOn ? "bg-brand" : "bg-muted-foreground/30"
          }`}
        >
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform ${
              isOn ? "translate-x-6" : "translate-x-1"
            }`}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" aria-hidden /> : null}
          </span>
        </button>
      </div>

      {denied ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          Benachrichtigungen sind im Browser blockiert. Tippe auf das Schloss-Symbol neben der
          Adresszeile → Benachrichtigungen → „Zulassen", dann hier erneut aktivieren.
        </p>
      ) : message ? (
        <p className="text-xs text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
