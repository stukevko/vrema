"use client";

import { enqueueClockAction, type QueuedClockActionType } from "@/lib/offline/clock-queue";
import type { clockIn, clockOut, toggleBreak } from "@/lib/actions/worklogs";

type ClockExec = {
  clockIn: () => ReturnType<typeof clockIn>;
  clockOut: () => ReturnType<typeof clockOut>;
  toggleBreak: () => ReturnType<typeof toggleBreak>;
};

export type ClockActionOutcome =
  | { mode: "queued" }
  | { mode: "online"; action: "clockIn"; result: Awaited<ReturnType<typeof clockIn>> }
  | { mode: "online"; action: "clockOut"; result: Awaited<ReturnType<typeof clockOut>> }
  | { mode: "online"; action: "toggleBreak"; result: Awaited<ReturnType<typeof toggleBreak>> };

export async function performClockAction(
  type: QueuedClockActionType,
  exec: ClockExec,
): Promise<ClockActionOutcome> {
  const clientTimestamp = new Date().toISOString();

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await enqueueClockAction(type, clientTimestamp);
    return { mode: "queued" };
  }

  try {
    if (type === "clockIn") {
      return { mode: "online", action: "clockIn", result: await exec.clockIn() };
    }
    if (type === "clockOut") {
      return { mode: "online", action: "clockOut", result: await exec.clockOut() };
    }
    return { mode: "online", action: "toggleBreak", result: await exec.toggleBreak() };
  } catch (e) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueClockAction(type, clientTimestamp);
      return { mode: "queued" };
    }
    throw e;
  }
}
