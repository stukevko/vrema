"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { AuthBrandLogo } from "@/components/brand/AuthBrandLogo";
import { Loader2, Mail, Lock } from "lucide-react";

export default function PartnerLoginPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    setError(null);
    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl: "/partner/dashboard",
        redirect: false,
      });
      if (!result?.ok || result.error) {
        setError("Partner-Zugang ungültig. Bitte E-Mail/Passwort prüfen.");
        return;
      }
      window.location.assign("/partner/dashboard");
    });
  };

  return (
    <div className="auth-shell flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <AuthBrandLogo />
        </div>

        <div className="auth-card p-8 sm:p-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Partner Login</h1>
          <p className="mt-1.5 text-sm text-fg-muted">Melden Sie sich mit Ihrem Partnerzugang an.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-muted">E-Mail</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="partner@firma.de"
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-muted">Passwort</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
                <input
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-sm"
                />
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-danger/30 bg-danger-soft/70 px-3.5 py-2.5 text-xs font-medium text-danger-foreground"
              >
                {error}
              </p>
            )}

            <button type="submit" disabled={isPending} className="btn-primary-solid w-full">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Einloggen
            </button>
          </form>

          <p className="mt-6 text-xs text-fg-muted">
            Kein Self-Register: Partnerzugänge werden zentral von Vrema angelegt.
          </p>
          <p className="mt-2 text-xs">
            <Link href="/" className="font-semibold text-brand hover:underline">
              Zurück zur Startseite
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

