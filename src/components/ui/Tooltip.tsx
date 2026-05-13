"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

/**
 * VREMA-Tooltip – einheitlicher Wrapper um `@radix-ui/react-tooltip`.
 *
 * Verwendung (kurz):
 *   <TooltipProvider>
 *     <Tooltip content="Bruttoumsatz / Personalkosten">
 *       <span className="cursor-help underline decoration-dotted">BU</span>
 *     </Tooltip>
 *   </TooltipProvider>
 *
 * Hinweis: TooltipProvider darf auf App-Ebene EINMAL gerendert werden – wir
 * setzen ihn defensiv direkt im Tooltip, damit lokale Verwendungen auch ohne
 * vorgelagerten Provider funktionieren.
 */

export const TooltipProvider = TooltipPrimitive.Provider;
export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

type TooltipContentProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(function TooltipContent({ className, sideOffset = 6, ...props }, ref) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={[
          "z-50 max-w-[260px] select-none rounded-lg",
          "border border-white/10 bg-[#0a3a52]/95 px-2.5 py-1.5 text-xs font-medium text-white",
          "shadow-[0_8px_24px_-8px_rgba(10,58,82,0.35)] backdrop-blur",
          "data-[state=delayed-open]:animate-in data-[state=closed]:animate-out",
          "data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1",
          "data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1",
          className ?? "",
        ].join(" ")}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
});

type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  asChild?: boolean;
};

/**
 * Convenience-Wrapper: `<Tooltip content="...">trigger</Tooltip>`.
 * Spart Boilerplate bei den 90 %-Anwendungsfällen.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  delayDuration = 250,
  asChild = true,
}: TooltipProps) {
  if (!content) return <>{children}</>;
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild={asChild}>{children}</TooltipPrimitive.Trigger>
        <TooltipContent side={side} align={align}>
          {content}
        </TooltipContent>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
