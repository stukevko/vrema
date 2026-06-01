"use client";

import { useEffect } from "react";
import { setAppBadge, subscribeToPush } from "@/lib/push/client";

/**
 * Synchronisiert beim App-Start das Homescreen-Badge mit dem aktuellen
 * Ungelesen-Zähler und re-registriert ein bereits erteiltes Push-Abo
 * (z. B. nach Deploy/SW-Update).
 *
 * Bewusst KEIN Permission-Prompt hier: das würde das Team beim Öffnen
 * nerven. Die explizite Aktivierung läuft über einen Button/Hinweis
 * (siehe `subscribeToPush(true)`).
 */
export function PushBootstrap({ unreadCount }: { unreadCount: number }) {
  useEffect(() => {
    setAppBadge(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    // Nur synchronisieren, wenn die Permission schon erteilt ist.
    void subscribeToPush(false);
  }, []);

  return null;
}
