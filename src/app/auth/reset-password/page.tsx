"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { AuthBrandLogo } from "@/components/brand/AuthBrandLogo";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Lock } from "lucide-react";
import { resetPassword } from "@/lib/actions/auth";
import { ToastContainer, useToast } from "@/components/ui/Toast";

function ResetPasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const { toasts, show, remove } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token") ?? "";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!token) {
      show("Reset-Token fehlt oder ist ungültig.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      show("Passwörter stimmen nicht überein.", "error");
      return;
    }

    startTransition(async () => {
      try {
        await resetPassword(token, newPassword);
        show("Passwort erfolgreich aktualisiert. Sie können sich jetzt anmelden.", "success");
        setTimeout(() => router.push("/auth/login"), 1200);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Reset fehlgeschlagen.";
        show(message, "error");
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="mb-10">
          <AuthBrandLogo />
        </div>

        <div className="rounded-2xl bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
          <h1 className="text-xl font-bold mb-1">Neues Passwort setzen</h1>
          <p className="text-muted-foreground text-sm mb-6">Wähle ein sicheres Passwort mit mindestens 8 Zeichen.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Neues Passwort</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Passwort bestätigen</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 rounded-xl bg-primary text-foreground font-bold flex items-center justify-center gap-2 hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(150,255,180,0.3)] transition-all disabled:opacity-60"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Passwort aktualisieren
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
