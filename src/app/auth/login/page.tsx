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
    <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center px-4">
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
            <span className="block text-[10px] text-white/25 font-mono uppercase tracking-widest">by KevkoStudio</span>
          </div>
        </div>

        <div className="rounded-2xl bg-[#141414] border border-white/5 p-8">
          <h1 className="text-xl font-bold mb-1">Willkommen zurück</h1>
          <p className="text-white/40 text-sm mb-8">Melde dich bei deinem Konto an.</p>

          {registered && (
            <p className="mb-4 rounded-lg border border-[#22c55e]/20 bg-[#22c55e]/10 px-3 py-2 text-xs text-[#86efac]">
              Check dein Postfach! Wir haben dir einen Bestätigungslink geschickt.
            </p>
          )}

          {verified && (
            <p className="mb-4 rounded-lg border border-[#22c55e]/20 bg-[#22c55e]/10 px-3 py-2 text-xs text-[#86efac]">
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
              <label className="text-xs text-white/50 mb-1.5 block">E-Mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  name="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@firma.de"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0b0b0b] border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#22c55e]/50 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Passwort</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0b0b0b] border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#22c55e]/50 transition-colors"
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
                className="w-full rounded-xl border border-[#22c55e]/25 bg-[#22c55e]/10 px-3 py-2 text-xs font-semibold text-[#86efac] hover:bg-[#22c55e]/15 transition-colors disabled:opacity-60"
              >
                {isResending ? "Sende..." : "Bestätigungslink erneut senden"}
              </button>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 rounded-xl bg-[#22c55e] text-black font-bold flex items-center justify-center gap-2 hover:bg-[#16a34a] transition-colors disabled:opacity-60"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Anmelden
            </button>

            <button
              type="button"
              onClick={handlePasskeyLogin}
              disabled={isPending}
              className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors disabled:opacity-60"
            >
              <Fingerprint className="w-4 h-4" />
              Mit Passkey anmelden
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-white/40 mb-3">
              <Link href="/auth/forgot-password" className="text-[#22c55e] hover:underline">
                Passwort vergessen?
              </Link>
            </p>
            <p className="text-sm text-white/40">
              Noch kein Konto?{" "}
              <Link href="/auth/register" className="text-[#22c55e] hover:underline">
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
    <Suspense fallback={<div className="min-h-screen bg-[#0b0b0b]" />}>
      <LoginForm />
    </Suspense>
  );
}
