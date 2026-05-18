"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Fingerprint, X } from "lucide-react";

const STORAGE_KEY = "vrema_passkey_nudge_dismissed";

export function PasskeySecurityNudge() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
      setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="no-print mb-4 rounded-2xl border border-line bg-surface px-4 py-3 text-sm shadow-sm dark:border-white/10 md:mb-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand/20">
          <Fingerprint className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">Konto absichern (optional)</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Passkey mit Face ID oder Touch ID — schneller Login, ohne 2FA-App. In den Einstellungen unter Sicherheit.
          </p>
          <Link
            href="/dashboard/settings"
            className="mt-2 inline-flex text-xs font-semibold text-brand underline-offset-4 hover:underline"
          >
            Passkey einrichten
          </Link>
        </div>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(STORAGE_KEY, "1");
            } catch {
              /* ignore */
            }
            setVisible(false);
          }}
          className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          aria-label="Hinweis ausblenden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
