"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

/**
 * Mobil: Sekundärinhalte eingeklappt. Desktop: immer sichtbar (`md:contents`).
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
        className="mb-2 flex min-h-11 w-full items-center justify-between gap-2 border-t border-border/50 py-3 text-left text-sm font-medium text-muted-foreground active:text-foreground md:hidden"
      >
        <span>{label}</span>
        <ChevronDown
          className={clsx("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      <div className={clsx(!open && "hidden", "md:block md:contents")}>{children}</div>
    </div>
  );
}
