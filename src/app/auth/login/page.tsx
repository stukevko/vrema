"use client";

import { Suspense, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { signIn as signInWithWebAuthn } from "next-auth/webauthn";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Fingerprint, Loader2, Mail, Lock } from "lucide-react";
import { resendVerificationLink } from "@/lib/actions/auth";
import { ToastContainer, useToast } from "@/components/ui/Toast";

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
          result.error.includes("Bitte verifiziere erst deine E-Mail")
        ) {
          setError("Bitte verifiziere erst deine E-Mail.");
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
      show("Bitte gib zuerst deine E-Mail ein.", "info");
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
        setError("Passkey-Anmeldung fehlgeschlagen. Bitte nutze alternativ dein Passwort.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <Image src="/vremalogo.png" alt="Vrema Logo" width={96} height={96} className="-mb-2" />
          <div className="text-center">
            <span className="font-bold text-xl tracking-tight">Vrema</span>
            <span className="block text-[10px] text-muted-foreground font-sans uppercase tracking-widest">by KevkoStudio</span>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
          <h1 className="text-xl font-bold mb-1">Willkommen zurück</h1>
          <p className="text-muted-foreground text-sm mb-8">Melde dich bei deinem Konto an.</p>

          {registered && (
            <p className="mb-4 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">
              Check dein Postfach! Wir haben dir einen Bestätigungslink geschickt.
            </p>
          )}

          {verified && (
            <p className="mb-4 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">
              E-Mail erfolgreich bestätigt. Du kannst dich jetzt anmelden.
            </p>
          )}

          {(verifyError === "invalid_verification" || verifyError === "expired_verification") && (
            <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              Verifizierungslink ungültig oder abgelaufen. Bitte registriere dich erneut oder fordere einen neuen Link an.
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
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border text-slate-900 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
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
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border text-slate-900 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
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
              className="w-full py-3 rounded-xl bg-primary text-black font-bold flex items-center justify-center gap-2 hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(150,255,180,0.3)] transition-all disabled:opacity-60"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Anmelden
            </button>

            <button
              type="button"
              onClick={handlePasskeyLogin}
              disabled={isPending}
              className="w-full py-3 rounded-xl bg-card backdrop-blur-xl border border-white shadow-[0_20px_50px_rgba(0,0,0,0.04)] text-slate-900 font-semibold flex items-center justify-center gap-2 hover:bg-card/80 transition-colors disabled:opacity-60"
            >
              <Fingerprint className="w-4 h-4" />
              Mit Passkey anmelden
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
      </motion.div>
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
