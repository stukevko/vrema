"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
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
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <Image
            src="/vrema_logo.png"
            alt="VREMA"
            width={400}
            height={112}
            className="h-24 w-auto max-w-full object-contain md:h-28"
            priority
          />
        </div>

        <div className="rounded-2xl bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
          <h1 className="text-xl font-bold mb-1">Partner Login</h1>
          <p className="text-muted-foreground text-sm mb-8">Melden Sie sich mit Ihrem Partnerzugang an.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">E-Mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="partner@firma.de"
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

            {error && <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 rounded-xl bg-primary text-foreground font-bold flex items-center justify-center gap-2 hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(150,255,180,0.3)] transition-all disabled:opacity-60"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Einloggen
            </button>
          </form>

          <p className="mt-6 text-xs text-muted-foreground">
            Kein Self-Register: Partnerzugänge werden zentral von Vrema angelegt.
          </p>
          <p className="mt-2 text-xs">
            <Link href="/" className="text-primary hover:underline">
              Zurück zur Startseite
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

