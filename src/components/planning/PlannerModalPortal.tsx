"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type PlannerModalPortalProps = {
  open: boolean;
  children: ReactNode;
};

/** Modals aus glossy-surface raus — sonst overflow:hidden + z-index Bugs. */
export function PlannerModalPortal({ open, children }: PlannerModalPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(children, document.body);
}
