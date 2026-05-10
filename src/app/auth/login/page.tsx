"use client";

import { Suspense, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { signIn as signInWithWebAuthn } from "next-auth/webauthn";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fingerprint, Loader2, Mail, Lock } from "lucide-react";
import { resendVerificationLink } from "@/lib/actions/auth";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { AuthBrandLogo } from "@/components/brand/AuthBrandLogo";

function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [isResending, startResendTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [showResend, setShowResend] = useState(false);
  const { toasts, show, remove } = useToast();
  const searchParams = useSearchParams();
  const requestedCallback = searchParams.get("callbackUrl") ?? "";
  const callbackUrl = requestedCallback.startsWith("/") ? requestedCallback : "/dashboard";
  const registered = searchParams.get("registered") === "1";
  const verified = searchParams.get("verified") === "1";
  const verifyError = searchParams.get("error");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const emailInput = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    setError(null);
    setShowResend(false);
    startTransition(async () => {
      const result = await signIn("credentials", {
        email: emailInput,
        password,
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        if (
          result.error.includes("unverified_email") ||
          result.error.includes("Bitte verifizieren Sie zuerst Ihre E-Mail-Adresse")
        ) {
          setError("Bitte verifizieren Sie zuerst Ihre E-Mail-Adresse.");
          setShowResend(true);
        } else {
          setError("E-Mail oder Passwort ist falsch.");
        }
        return;
      }

      if (!result?.ok) {
        setError("Anmeldung fehlgeschlagen. Bitte erneut versuchen.");
        return;
      }

      window.location.assign(callbackUrl);
    });
  };

  const handleResendVerification = () => {
    if (!email.trim()) {
      show("Bitte geben Sie zuerst Ihre E-Mail-Adresse ein.", "info");
      return;
    }

    startResendTransition(async () => {
      try {
        await resendVerificationLink(email);
        show("Falls das Konto unverifiziert ist, wurde ein neuer Link gesendet.", "success");
      } catch {
        show("Link konnte nicht gesendet werden. Bitte später erneut versuchen.", "error");
      }
    });
  };

  const handlePasskeyLogin = () => {
    startTransition(async () => {
      try {
        await signInWithWebAuthn("passkey", {
          redirectTo: callbackUrl,
        });
      } catch {
        setError("Passkey-Anmeldung fehlgeschlagen. Bitte melden Sie sich alternativ mit Passwort an.");
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Willkommen zurück</h1>
          <p className="mt-1.5 text-sm text-fg-muted">Melden Sie sich mit Ihren Zugangsdaten an.</p>

          {registered && (
            <p className="mt-6 rounded-xl border border-brand/25 bg-brand-soft/80 px-3.5 py-2.5 text-xs font-medium text-brand">
              Bitte prüfen Sie Ihr E-Mail-Postfach. Wir haben Ihnen einen Bestätigungslink gesendet.
            </p>
          )}

          {verified && (
            <p className="mt-6 rounded-xl border border-brand/25 bg-brand-soft/80 px-3.5 py-2.5 text-xs font-medium text-brand">
              E-Mail erfolgreich bestätigt. Sie können sich jetzt anmelden.
            </p>
          )}

          {(verifyError === "invalid_verification" || verifyError === "expired_verification") && (
            <p className="mt-6 rounded-xl border border-danger/30 bg-danger-soft/80 px-3.5 py-2.5 text-xs font-medium text-danger-foreground">
              Verifizierungslink ungültig oder abgelaufen. Bitte registrieren Sie sich erneut oder fordern Sie einen neuen Link an.
            </p>
          )}

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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@firma.de"
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

            {showResend && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full rounded-xl border border-brand/30 bg-brand-soft px-3 py-2.5 text-xs font-semibold text-brand transition-colors hover:bg-brand-soft/70 disabled:opacity-60"
              >
                {isResending ? "Sende..." : "Bestätigungslink erneut senden"}
              </button>
            )}

            <button type="submit" disabled={isPending} className="btn-primary-solid w-full">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {isPending ? "Lädt..." : "Anmelden"}
            </button>

            <button
              type="button"
              onClick={handlePasskeyLogin}
              disabled={isPending}
              className="btn-secondary-outline w-full"
            >
              <Fingerprint className="h-4 w-4" aria-hidden />
              {isPending ? "Lädt..." : "Mit Passkey anmelden"}
            </button>
          </form>

          <div className="mt-7 border-t border-line pt-6 text-center">
            <p className="mb-2 text-xs text-fg-muted">
              <Link href="/auth/forgot-password" className="font-medium text-brand hover:underline">
                Passwort vergessen?
              </Link>
            </p>
            <p className="text-sm text-fg-muted">
              Noch kein Konto?{" "}
              <Link href="/auth/register" className="font-semibold text-brand hover:underline">
                Kostenlos registrieren
              </Link>
            </p>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} remove={remove} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginForm />
    </Suspense>
  );
}
