"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

const ICONS = { success: CheckCircle, error: XCircle, info: Info };
const COLORS: Record<ToastType, string> = {
  success: "border-brand/30 text-brand dark:border-white/10",
  error: "border-danger/30 text-danger-foreground dark:border-white/10",
  info: "border-line text-fg-muted dark:border-white/10",
};

export function Toast({ message, type = "info", onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  const Icon = ICONS[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className={`flex max-w-sm items-start gap-3 rounded-xl border bg-surface/90 px-4 py-3 font-sans text-sm backdrop-blur-md shadow-[var(--shadow-pop)] dark:bg-surface/75 ${COLORS[type]}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1 text-foreground">{message}</span>
      <button
        onClick={onClose}
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Schließen"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([]);

  const show = (message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return { toasts, show, remove };
}

export function ToastContainer({ toasts, remove }: { toasts: ReturnType<typeof useToast>["toasts"]; remove: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => remove(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}
