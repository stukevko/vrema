"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { flushOfflineClockQueue } from "@/lib/offline/sync-clock-queue";

/** Synchronisiert Offline-Stempel sobald die Verbindung zurück ist. */
export function OfflineClockSync() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const ok = await flushOfflineClockQueue({ silent: false });
      if (ok) router.refresh();
    };

    const onOnline = () => void run();
    window.addEventListener("online", onOnline);
    if (navigator.onLine) void run();

    return () => window.removeEventListener("online", onOnline);
  }, [router]);

  return null;
}
