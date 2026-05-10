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
    <div className="auth-shell flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <AuthBrandLogo />
        </div>

        <div className="auth-card p-8 sm:p-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Passwort vergessen</h1>
          <p className="mt-1.5 text-sm text-fg-muted">
            Wir senden Ihnen einen sicheren Link zum Zurücksetzen des Passworts per E-Mail.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-muted">E-Mail</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@firma.de"
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-sm"
                />
              </div>
            </div>

            <button type="submit" disabled={isPending} className="btn-primary-solid w-full">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Reset-Link senden
            </button>
          </form>

          <div className="mt-7 border-t border-line pt-6 text-center">
            <Link href="/auth/login" className="text-sm font-semibold text-brand hover:underline">
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
