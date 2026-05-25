"use client";

import { useEffect, useState } from "react";
import { Smartphone, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "vrema-pwa-hint-dismissed";

export function PwaInstallHint() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const ua = window.navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua);
    setIsIos(ios);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    if (ios && !(window.navigator as Navigator & { standalone?: boolean }).standalone) {
      setVisible(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    dismiss();
  };

  if (!visible) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-brand/25 bg-brand/5 px-4 py-3 text-sm md:hidden">
      <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">App-Feeling auf dem Handy</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {isIos
            ? "Teilen → „Zum Home-Bildschirm“ — Stempeln und Planer immer griffbereit."
            : "VREMA installieren — Stempeln und Planer wie eine App."}
        </p>
        {!isIos && deferred ? (
          <button
            type="button"
            onClick={() => void install()}
            className="mt-2 text-xs font-bold text-brand hover:underline"
          >
            Jetzt installieren
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted/50"
        aria-label="Hinweis schließen"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
