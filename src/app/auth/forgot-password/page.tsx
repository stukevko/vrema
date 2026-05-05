"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { AuthBrandLogo } from "@/components/brand/AuthBrandLogo";
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
    <div className="public-page flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-10">
          <AuthBrandLogo />
        </div>

        <div className="public-card rounded-2xl p-8">
          <h1 className="text-xl font-bold mb-1">Passwort vergessen</h1>
          <p className="text-muted-foreground text-sm mb-6">Wir senden Ihnen einen sicheren Link zum Zurücksetzen des Passworts per E-Mail.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">E-Mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@firma.de"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary-solid flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold disabled:opacity-60"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Reset-Link senden
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <Link href="/auth/login" className="text-sm text-primary hover:underline">
              Zurück zum Login
            </Link>
          </div>
        </div>
      </div>
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
