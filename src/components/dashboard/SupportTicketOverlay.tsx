"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { SupportTicketInbox } from "@/components/dashboard/SupportTicketInbox";
import { ToastContainer, useToast } from "@/components/ui/Toast";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Nach Lesen/Erstellen: Badge im Layout aktualisieren */
  onSupportActivity?: () => void;
  /** Direkt erste ungelesene Antwort öffnen (z. B. Badge-Klick) */
  initialFocusUnread?: boolean;
  onInitialFocusUnreadConsumed?: () => void;
};

export function SupportTicketOverlay({
  open,
  onClose,
  onSupportActivity,
  initialFocusUnread = false,
  onInitialFocusUnreadConsumed,
}: Props) {
  const { toasts, show, remove } = useToast();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const swipeStartYRef = useRef<number | null>(null);
  const [inboxKey, setInboxKey] = useState(0);

  useEffect(() => {
    if (!open) setInboxKey((k) => k + 1);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
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
            className="fixed left-1/2 top-1/2 z-[141] w-[min(92vw,720px)] max-h-[min(92vh,840px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-card p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-6 max-md:inset-0 max-md:left-0 max-md:top-0 max-md:h-[100dvh] max-md:max-h-none max-md:w-full max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none max-md:p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Hilfe und Support"
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
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Hilfe & Support</h2>
                <p className="text-xs text-muted-foreground">Postfach: Tickets lesen oder neu erstellen.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
                aria-label="Schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <SupportTicketInbox
              key={inboxKey}
              variant="modal"
              initialFocusUnread={initialFocusUnread}
              onInitialFocusUnreadConsumed={onInitialFocusUnreadConsumed}
              onActivity={onSupportActivity}
              onCreatedToast={(message) => show(message, "success")}
              onCreateErrorToast={(message) => show(message, "error")}
            />
          </div>
        </div>
      ) : null}
      <ToastContainer toasts={toasts} remove={remove} />
    </>
  );
}
