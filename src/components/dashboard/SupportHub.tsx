"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";

type Tab = "vrema" | "team";

export function SupportHub({
  canManageTeam,
  vremaInbox,
  teamInbox,
}: {
  canManageTeam: boolean;
  vremaInbox: ReactNode;
  teamInbox: ReactNode;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab: Tab =
    canManageTeam && searchParams.get("tab") === "team" ? "team" : "vrema";
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (canManageTeam && t === "team") setTab("team");
    else if (t !== "team") setTab("vrema");
  }, [searchParams, canManageTeam]);

  const selectTab = useCallback(
    (next: Tab) => {
      setTab(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "team") params.set("tab", "team");
      else params.delete("tab");
      const q = params.toString();
      router.replace(q ? `/dashboard/support?${q}` : "/dashboard/support", { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div className="space-y-4">
      {canManageTeam ? (
        <div
          className="flex gap-1 rounded-2xl border border-border bg-muted/40 p-1"
          role="tablist"
          aria-label="Support-Bereich"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "vrema"}
            onClick={() => selectTab("vrema")}
            className={clsx(
              "min-h-10 flex-1 rounded-xl px-3 text-sm font-semibold transition-colors",
              tab === "vrema" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            An VREMA
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "team"}
            onClick={() => selectTab("team")}
            className={clsx(
              "min-h-10 flex-1 rounded-xl px-3 text-sm font-semibold transition-colors",
              tab === "team" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            Team-Tickets
          </button>
        </div>
      ) : null}

      {tab === "vrema" || !canManageTeam ? vremaInbox : teamInbox}
    </div>
  );
}
