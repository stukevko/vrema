"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal } from "lucide-react";

/**
 * VREMA-IconMenu – Drei-Punkte-Menü für sekundäre Aktionen.
 *
 * Idee: Auf einem Dashboard soll nur die Haupt-Action prominent stehen.
 * Sekundäre Aktionen (Export, Filter, Drucken, Archiv) liegen hinter „⋯".
 *
 * Verwendung:
 *   <IconMenu label="Optionen">
 *     <IconMenu.Item onSelect={...} icon={<Download className="h-4 w-4" />}>CSV-Export</IconMenu.Item>
 *     <IconMenu.Item onSelect={...} icon={<Filter className="h-4 w-4" />}>Filter</IconMenu.Item>
 *   </IconMenu>
 *
 *  WICHTIG: `icon` muss als JSX (ReactNode) übergeben werden, NIE als Komponenten-Funktion
 *  (`icon={Download}`). Der zweite Stil bricht Server→Client-Serialisierung in Next 15.
 */

type IconMenuProps = {
  label?: string;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  triggerClassName?: string;
};

export function IconMenu({ label = "Weitere Aktionen", children, align = "end", triggerClassName = "" }: IconMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className={[
            "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line/60",
            "bg-surface/70 text-fg-muted backdrop-blur transition-colors",
            "hover:border-brand/35 hover:text-fg focus:outline-none focus:ring-2 focus:ring-brand/30",
            "data-[state=open]:border-brand/45 data-[state=open]:text-fg",
            triggerClassName,
          ].join(" ")}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          className={[
            "z-50 min-w-[200px] overflow-hidden rounded-xl border border-line/60",
            "bg-white/95 p-1 text-sm shadow-[0_18px_36px_-18px_rgba(10,58,82,0.35)] backdrop-blur",
            "dark:bg-[#0f1318]/95 dark:border-white/10",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
          ].join(" ")}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

type IconMenuItemProps = {
  children: React.ReactNode;
  onSelect?: (event: Event) => void;
  /**
   *  Icon als bereits gerenderter ReactNode – z. B. `<FileText className="h-4 w-4" />`.
   *
   *  Wichtig: NIE die Lucide-Komponente direkt als Funktion durchreichen.
   *  In Next 15 + React 19 wirft das Server→Client-Boundary einen Serializer-Error
   *  (`Functions cannot be passed directly to Client Components`).
   */
  icon?: React.ReactNode;
  disabled?: boolean;
  tone?: "neutral" | "danger";
  asChild?: boolean;
};

function IconMenuItem({
  children,
  onSelect,
  icon,
  disabled,
  tone = "neutral",
  asChild,
}: IconMenuItemProps) {
  const toneClass =
    tone === "danger"
      ? "text-rose-600 data-[highlighted]:bg-rose-50 dark:text-rose-300 dark:data-[highlighted]:bg-rose-500/15"
      : "text-fg data-[highlighted]:bg-brand/8 dark:data-[highlighted]:bg-brand/15";

  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      disabled={disabled}
      asChild={asChild}
      className={[
        "flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none transition-colors",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40",
        toneClass,
      ].join(" ")}
    >
      <span className="flex w-full items-center gap-2">
        {icon ? <span className="flex h-4 w-4 shrink-0 items-center justify-center">{icon}</span> : null}
        {children}
      </span>
    </DropdownMenu.Item>
  );
}

function IconMenuSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-line/60 dark:bg-white/10" />;
}

function IconMenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenu.Label className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-fg-muted">
      {children}
    </DropdownMenu.Label>
  );
}

IconMenu.Item = IconMenuItem;
IconMenu.Separator = IconMenuSeparator;
IconMenu.Label = IconMenuLabel;
