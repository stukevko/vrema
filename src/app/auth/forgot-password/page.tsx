"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Loader2, Mail } from "lucide-react";
import { requestPasswordReset } from "@/lib/actions/auth";
import { ToastContainer, useToast } from "@/components/ui/Toast";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const { toasts, show, remove } = useToast();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await requestPasswordReset(email);
        show("Falls diese E-Mail existiert, haben wir einen Link gesendet.", "success");
      } catch {
        show("Fehler beim Senden. Bitte später erneut versuchen.", "error");
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex flex-col items-center gap-3 mb-8">
          <Image src="/vremalogo.png" alt="Vrema Logo" width={96} height={96} className="-mb-2" />
          <div className="text-center">
            <span className="font-bold text-xl tracking-tight">Vrema</span>
            <span className="block text-[10px] text-white/25 font-sans uppercase tracking-widest">by KevkoStudio</span>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-white/5 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <h1 className="text-xl font-bold mb-1">Passwort vergessen</h1>
          <p className="text-white/40 text-sm mb-6">Wir senden dir einen sicheren Reset-Link per E-Mail.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">E-Mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@firma.de"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 rounded-xl bg-primary text-black font-bold flex items-center justify-center gap-2 hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(150,255,180,0.3)] transition-all disabled:opacity-60"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Reset-Link senden
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <Link href="/auth/login" className="text-sm text-primary hover:underline">
              Zurück zum Login
            </Link>
          </div>
        </div>
      </motion.div>
      <ToastContainer toasts={toasts} remove={remove} />
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
