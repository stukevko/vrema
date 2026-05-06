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
  const callbackUrl = "/dashboard";
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
    <div className="public-page flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-10">
          <AuthBrandLogo />
        </div>

        <div className="public-card rounded-2xl p-8">
          <h1 className="text-xl font-bold mb-1">Willkommen zurück</h1>
          <p className="text-muted-foreground text-sm mb-8">Melden Sie sich mit Ihren Zugangsdaten an.</p>

          {registered && (
            <p className="mb-4 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">
              Bitte prüfen Sie Ihr E-Mail-Postfach. Wir haben Ihnen einen Bestätigungslink gesendet.
            </p>
          )}

          {verified && (
            <p className="mb-4 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">
              E-Mail erfolgreich bestätigt. Sie können sich jetzt anmelden.
            </p>
          )}

          {(verifyError === "invalid_verification" || verifyError === "expired_verification") && (
            <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              Verifizierungslink ungültig oder abgelaufen. Bitte registrieren Sie sich erneut oder fordern Sie einen neuen Link an.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">E-Mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  name="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@firma.de"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Passwort</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {showResend && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors disabled:opacity-60"
              >
                {isResending ? "Sende..." : "Bestätigungslink erneut senden"}
              </button>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary-solid flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold disabled:opacity-60"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPending ? "Lädt..." : "Anmelden"}
            </button>

            <button
              type="button"
              onClick={handlePasskeyLogin}
              disabled={isPending}
              className="btn-secondary-outline flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold disabled:opacity-60"
            >
              <Fingerprint className="w-4 h-4" />
              {isPending ? "Lädt..." : "Mit Passkey anmelden"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground mb-3">
              <Link href="/auth/forgot-password" className="text-primary hover:underline">
                Passwort vergessen?
              </Link>
            </p>
            <p className="text-sm text-muted-foreground">
              Noch kein Konto?{" "}
              <Link href="/auth/register" className="text-primary hover:underline">
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
