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
const COLORS = {
  success: "border-[#22c55e]/30 text-[#22c55e]",
  error: "border-red-500/30 text-red-400",
  info: "border-blue-400/30 text-blue-400",
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
      className={`flex items-start gap-3 px-4 py-3 rounded-xl bg-[#141414] border font-mono text-sm max-w-sm shadow-xl ${COLORS[type]}`}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <span className="text-white/80 flex-1">{message}</span>
      <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([]);

  const show = (message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return { toasts, show, remove };
}

// ── Container ─────────────────────────────────────────────────────────────────
export function ToastContainer({ toasts, remove }: { toasts: ReturnType<typeof useToast>["toasts"]; remove: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end">
      <AnimatePresence>
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => remove(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}
