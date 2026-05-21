"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

/** Nach Server Actions in Client-Komponenten: Props neu laden (revalidatePath allein reicht oft nicht). */
export function useDashboardMutation() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const run = useCallback(
    (action: () => Promise<void>) => {
      startTransition(async () => {
        await action();
        router.refresh();
      });
    },
    [router],
  );

  return { isPending, startTransition, run, refresh };
}
