"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

/**
 * Mobil: Sekundärinhalte hinter „Mehr anzeigen“. Desktop: Kinder immer sichtbar (`md:contents`).
 */
export function CollapsibleMobileSection({
  label,
  children,
  defaultOpen = false,
  className,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={clsx("min-w-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mb-3 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors active:scale-[0.99] md:hidden"
      >
        <span>{label}</span>
        <ChevronDown
          className={clsx("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      <div className={clsx(!open && "hidden", "md:block md:contents")}>{children}</div>
    </div>
  );
}
