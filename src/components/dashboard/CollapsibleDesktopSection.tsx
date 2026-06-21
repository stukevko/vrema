"use client";

import { ChevronDown } from "lucide-react";
import clsx from "clsx";

/** Desktop: Sekundärinhalte eingeklappt — Start bleibt fokussiert. */
export function CollapsibleDesktopSection({
  label,
  children,
  className,
  defaultOpen = false,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  return (
    <details className={clsx("group max-md:hidden", className)} open={defaultOpen ? true : undefined}>
      <summary className="mb-3 flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-2xl border border-border/60 px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground [&::-webkit-details-marker]:hidden">
        <span>{label}</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="space-y-4 pb-1">{children}</div>
    </details>
  );
}
