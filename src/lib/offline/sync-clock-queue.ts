"use client";

import { toast } from "sonner";
import { syncOfflineClockActions } from "@/lib/actions/worklogs";
import { getQueuedClockActions, removeQueuedClockActions } from "@/lib/offline/clock-queue";
import { userErrorMessage } from "@/lib/errors/user-message";

let flushing = false;

/** Verarbeitet ausstehende Offline-Stempel in Reihenfolge — idempotent gegen Doppelaufrufe. */
export async function flushOfflineClockQueue(options?: { silent?: boolean }): Promise<boolean> {
  if (typeof window === "undefined" || !navigator.onLine) return false;
  if (flushing) return false;

  const pending = await getQueuedClockActions();
  if (pending.length === 0) return true;

  flushing = true;
  try {
    const result = await syncOfflineClockActions(
      pending.map((a) => ({ id: a.id, type: a.type, clientTimestamp: a.clientTimestamp })),
    );
    await removeQueuedClockActions(result.syncedIds);
    if (!options?.silent && result.syncedIds.length > 0) {
      toast.success(
        result.syncedIds.length === 1
          ? "Offline-Stempel synchronisiert."
          : `${result.syncedIds.length} Offline-Stempel synchronisiert.`,
      );
    }
    return result.syncedIds.length === pending.length;
  } catch (e: unknown) {
    if (!options?.silent) {
      toast.error(userErrorMessage(e, "Offline-Stempel konnten nicht synchronisiert werden."));
    }
    return false;
  } finally {
    flushing = false;
  }
}
