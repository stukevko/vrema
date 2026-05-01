"use client";

import { useState, useTransition } from "react";
import { signIn as signInWithWebAuthn } from "next-auth/webauthn";
import { Fingerprint, Loader2 } from "lucide-react";

export function PasskeySecurityForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRegisterPasskey = () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await signInWithWebAuthn("passkey", {
          redirect: false,
          redirectTo: "/dashboard/settings",
          // Auth.js WebAuthn endpoint recognizes this query param.
          action: "register",
        } as never);
        setSuccess("Passkey erfolgreich registriert.");
      } catch {
        setError("Passkey konnte nicht registriert werden.");
      }
    });
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
      <p className="text-sm text-white/60">
        Registriere einen Passkey (Face ID, Touch ID oder Windows Hello) für eine schnelle und sichere Anmeldung.
      </p>

      {error && (
        <p className="text-xs text-red-400 font-sans bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2">
          ✗ {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-primary font-sans bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
          ✓ {success}
        </p>
      )}

      <button
        type="button"
        onClick={handleRegisterPasskey}
        disabled={isPending}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card hover:bg-card/80 border border-border text-sm font-medium transition-colors disabled:opacity-60"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
        Neuen Passkey registrieren
      </button>
    </div>
  );
}
