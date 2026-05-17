"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

type Align = "start" | "end";

type AnchoredPopoverProps = {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  align?: Align;
  offsetPx?: number;
  onClose?: () => void;
  role?: string;
  "aria-label"?: string;
};

/**
 * Rendert Popover per Portal auf `document.body` mit `position: fixed`.
 * Verhindert, dass Topbar-Dropdowns hinter dem scrollenden `<main>` landen (Mobile).
 */
export function AnchoredPopover({
  open,
  anchorRef,
  children,
  className,
  align = "end",
  offsetPx = 6,
  onClose,
  role,
  "aria-label": ariaLabel,
}: AnchoredPopoverProps) {
  const [mounted, setMounted] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const top = rect.bottom + offsetPx;
    if (align === "end") {
      setStyle({
        position: "fixed",
        top,
        right: Math.max(8, window.innerWidth - rect.right),
        zIndex: 200,
        visibility: "visible",
      });
    } else {
      setStyle({
        position: "fixed",
        top,
        left: Math.max(8, rect.left),
        zIndex: 200,
        visibility: "visible",
      });
    }
  }, [align, anchorRef, offsetPx]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => {
      updatePosition();
      onClose?.();
    };
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, onClose, updatePosition]);

  if (!mounted || !open) return null;

  return createPortal(
    <div style={style} className={className} role={role} aria-label={ariaLabel}>
      {children}
    </div>,
    document.body,
  );
}
