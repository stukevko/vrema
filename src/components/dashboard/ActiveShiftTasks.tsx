"use client";
import { userErrorMessage } from "@/lib/errors/user-message";

import { useOptimistic, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { toggleShiftTaskItem } from "@/lib/actions/shift-tasks";
import type { ActiveShiftTasksDTO } from "@/lib/shift-tasks/active-shift-tasks-data";
import type { ShiftTaskItemStatus } from "@prisma/client";

type Initial = NonNullable<ActiveShiftTasksDTO>;
type TaskRow = Initial["items"][number];

type ToggleAction = { itemId: string; nextStatus: ShiftTaskItemStatus };

function applyToggle(items: TaskRow[], action: ToggleAction): TaskRow[] {
  return items.map((i) =>
    i.id === action.itemId
      ? {
          ...i,
          status: action.nextStatus,
        }
      : i,
  );
}

export function ActiveShiftTasks({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [items, addOptimistic] = useOptimistic(initial.items, applyToggle);

  const total = items.length;
  const doneCount = items.filter((i) => i.status === "DONE").length;
  const allDone = total > 0 && doneCount === total;

  const onToggle = (row: TaskRow) => {
    const currentlyDone = row.status === "DONE";
    const nextDone = !currentlyDone;
    const nextStatus: ShiftTaskItemStatus = nextDone ? "DONE" : "PENDING";
    const doneBefore = items.filter((i) => i.status === "DONE").length;
    const delta =
      nextDone && !currentlyDone ? 1 : !nextDone && currentlyDone ? -1 : 0;
    const nextDoneCount = doneBefore + delta;

    startTransition(async () => {
      setPendingId(row.id);
      addOptimistic({ itemId: row.id, nextStatus });
      try {
        await toggleShiftTaskItem(row.id, nextDone);

        if (nextDone && nextDoneCount === total) {
          confetti({
            particleCount: 72,
            spread: 68,
            origin: { y: 0.72 },
            scalar: 1.05,
          });
          toast.success("Alle Aufgaben erledigt – stark!");
        } else {
          toast.success(nextDone ? "Erledigt" : "Wieder offen");
        }

        await router.refresh();
      } catch (e: unknown) {
        toast.error(userErrorMessage(e, "Konnte nicht speichern."));
        await router.refresh();
      } finally {
        setPendingId(null);
      }
    });
  };

  return (
    <div className="w-full">
      {initial.templateName ? (
        <p className="mb-3 truncate text-[11px] text-muted-foreground">{initial.templateName}</p>
      ) : null}

      {allDone ? (
        <p className="mb-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-center text-xs font-medium text-primary">
          Checkliste komplett – gute Arbeit.
        </p>
      ) : null}

      <ul className="flex flex-col gap-2" aria-busy={isPending}>
        {items.map((row) => {
          const isDone = row.status === "DONE";
          return (
            <li key={row.id}>
              <button
                type="button"
                disabled={isPending}
                onClick={() => onToggle(row)}
                role="checkbox"
                aria-checked={isDone}
                aria-busy={pendingId === row.id}
                className="flex min-h-[52px] w-full items-start gap-3 rounded-2xl border border-border bg-background/80 px-3 py-3 text-left shadow-sm transition-[transform,background-color] active:scale-[0.99] disabled:opacity-70 sm:min-h-12 sm:py-2.5 touch-manipulation"
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 transition-colors ${
                    isDone ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/35 bg-card"
                  }`}
                  aria-hidden
                >
                  {isDone ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
                </span>
                <span
                  className={`flex-1 pt-1 text-sm font-medium leading-snug sm:pt-0.5 ${
                    isDone ? "text-muted-foreground line-through decoration-muted-foreground/60" : "text-foreground"
                  }`}
                >
                  {row.title}
                </span>
                {pendingId === row.id ? (
                  <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
