"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { SupportTicketCreateForm } from "@/components/dashboard/SupportTicketCreateForm";
import { ToastContainer, useToast } from "@/components/ui/Toast";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SupportTicketOverlay({ open, onClose }: Props) {
  const { toasts, show, remove } = useToast();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const swipeStartYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const timer = window.setTimeout(() => {
      const subject = panelRef.current?.querySelector<HTMLInputElement>("[data-support-subject]");
      subject?.focus();
    }, 40);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-[140]">
          <button
            type="button"
            aria-label="Support-Dialog schließen"
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />

          <div
            ref={panelRef}
            className="fixed left-1/2 top-1/2 z-[141] w-[min(92vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-6 max-md:inset-0 max-md:left-0 max-md:top-0 max-md:w-full max-md:h-[100dvh] max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none max-md:p-4 max-md:overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Neues Support-Ticket"
            onTouchStart={(e) => {
              swipeStartYRef.current = e.changedTouches[0]?.clientY ?? null;
            }}
            onTouchEnd={(e) => {
              const startY = swipeStartYRef.current;
              const endY = e.changedTouches[0]?.clientY;
              swipeStartYRef.current = null;
              if (startY == null || endY == null) return;
              if (endY - startY > 90) onClose();
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Support-Ticket erstellen</h2>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
                aria-label="Schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <SupportTicketCreateForm
              onSuccess={() => {
                onClose();
                show("Support-Ticket erfolgreich erstellt! Wir melden uns bei dir.", "success");
              }}
              onError={(message) => show(message, "error")}
            />
          </div>
        </div>
      ) : null}
      <ToastContainer toasts={toasts} remove={remove} />
    </>
  );
}
