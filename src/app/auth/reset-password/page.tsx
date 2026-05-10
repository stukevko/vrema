"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { AuthBrandLogo } from "@/components/brand/AuthBrandLogo";
import { useRouter, useSearchParams } from "next/navigation";
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
    <div className="auth-shell flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <AuthBrandLogo />
        </div>

        <div className="auth-card p-8 sm:p-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Neues Passwort setzen</h1>
          <p className="mt-1.5 text-sm text-fg-muted">Wähle ein sicheres Passwort mit mindestens 8 Zeichen.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-muted">Neues Passwort</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-muted">Passwort bestätigen</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-sm"
                />
              </div>
            </div>

            <button type="submit" disabled={isPending} className="btn-primary-solid w-full">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Passwort aktualisieren
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
