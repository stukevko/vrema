"use client";

import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import {
  hasActivePushSubscription,
  isPushSupported,
  pushPermission,
  subscribeToPush,
} from "@/lib/push/client";

/**
 * Hinweis im Planer, der echtes Web Push aktiviert (ergänzt die In-App-Glocke).
 * Ist Push bereits aktiv, blendet sich der Baustein aus.
 */
export function TradePushHint() {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const [justActivated, setJustActivated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!isPushSupported()) return;
    setSupported(true);
    setDenied(pushPermission() === "denied");
    (async () => {
      const has = await hasActivePushSubscription();
      if (!cancelled) setActive(has);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      const ok = await subscribeToPush(true);
      if (ok) {
        setActive(true);
        setJustActivated(true);
        return;
      }
      setDenied(pushPermission() === "denied");
    } finally {
      setBusy(false);
    }
  };

  // Bereits dauerhaft aktiv (und nicht gerade frisch eingeschaltet) → ausblenden.
  if (!supported || (active && !justActivated)) return null;

  if (justActivated) {
    return (
      <div className="rounded-xl border border-emerald-300/60 bg-emerald-50 px-4 py-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
            <Check className="h-4 w-4" aria-hidden />
          </span>
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            Push aktiviert — du bekommst Schicht-Updates jetzt aufs Handy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface/90 px-4 py-3 dark:border-white/10">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/12 text-brand">
          <Bell className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-semibold text-foreground">Benachrichtigung bei offenen Schichten</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Neue offene Schichten und Übernahme-Anfragen landen in der Glocke oben. Aktiviere
            zusätzlich Push, dann erreichen sie dich auch bei geschlossener App.
          </p>
          <button
            type="button"
            onClick={() => void enable()}
            disabled={busy}
            className="inline-flex min-h-10 items-center rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground disabled:opacity-60"
          >
            {busy ? "Wird aktiviert …" : denied ? "Im Browser erlauben (Einstellungen)" : "Push aktivieren"}
          </button>
          {denied ? (
            <p className="text-xs text-muted-foreground">
              Blockiert? Tippe auf das Schloss-Symbol neben der Adresszeile → Benachrichtigungen →
              „Zulassen".
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
