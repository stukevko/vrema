"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Loader2, Mail, Lock, Building2, User } from "lucide-react";

const LS_REF = "vrema_affiliate_ref";
const LS_REF_NAME = "vrema_affiliate_ref_name";
const COOKIE_REF = "vrema_affiliate_ref";

function setRefCookie(code: string) {
  document.cookie = `${COOKIE_REF}=${encodeURIComponent(code)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

function getRefCookie(): string {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_REF}=`));
  if (!match) return "";
  const raw = match.slice(COOKIE_REF.length + 1).trim().toLowerCase();
  return decodeURIComponent(raw);
}

function clearRefCookie() {
  document.cookie = `${COOKIE_REF}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

type Props = {
  initialPlan: string;
  refCode: string;
  affiliatePartnerName: string | null;
};

export function RegisterClient({ initialPlan, refCode, affiliatePartnerName }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const plan = initialPlan;

  const [resolvedCode, setResolvedCode] = useState(() => refCode.trim().toLowerCase());
  const [resolvedName, setResolvedName] = useState<string | null>(affiliatePartnerName);

  useEffect(() => {
    let cancelled = false;
    const urlCode = refCode.trim().toLowerCase();
    const urlName = affiliatePartnerName;

    if (urlCode) {
      try {
        localStorage.setItem(LS_REF, urlCode);
        if (urlName) localStorage.setItem(LS_REF_NAME, urlName);
        setRefCookie(urlCode);
      } catch {
        try {
          setRefCookie(urlCode);
        } catch {
          /* ignore */
        }
      }
      setResolvedCode(urlCode);
      setResolvedName(urlName);
      return;
    }

    async function fromStorage() {
      let c = "";
      let n: string | null = null;
      try {
        c = localStorage.getItem(LS_REF)?.trim().toLowerCase() ?? "";
        n = localStorage.getItem(LS_REF_NAME);
      } catch {
        c = getRefCookie();
      }
      if (!c) c = getRefCookie();
      if (!c || cancelled) return;
      setResolvedCode(c);
      if (n) {
        setResolvedName(n);
        return;
      }
      try {
        const r = await fetch(`/api/public/affiliate-preview?code=${encodeURIComponent(c)}`);
        const j = (await r.json()) as { name?: string | null };
        if (!cancelled && j.name) setResolvedName(j.name);
      } catch {
        /* ignore */
      }
    }

    void fromStorage();
    return () => {
      cancelled = true;
    };
  }, [refCode, affiliatePartnerName]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.get("name"),
            email: data.get("email"),
            password: data.get("password"),
            companyName: data.get("companyName"),
            plan,
            affiliateCode: resolvedCode || undefined,
          }),
        });

        if (!res.ok) {
          const json = await res.json();
          setError(json.error ?? "Registrierung fehlgeschlagen.");
          return;
        }

        try {
          localStorage.removeItem(LS_REF);
          localStorage.removeItem(LS_REF_NAME);
        } catch {
          /* ignore */
        }
        clearRefCookie();

        router.push("/auth/login?registered=1");
      } catch {
        setError("Ein unerwarteter Fehler ist aufgetreten.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center gap-3 mb-8">
          <Image src="/vremalogo.png" alt="Vrema Logo" width={80} height={80} className="-mb-2" />
          <div className="text-center">
            <span className="font-bold text-xl tracking-tight">Vrema</span>
            <span className="block text-[10px] text-muted-foreground font-sans uppercase tracking-widest">by KevkoStudio</span>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
          <h1 className="text-xl font-bold mb-1">Konto erstellen</h1>
          <p className="text-muted-foreground text-sm mb-2">14 Tage kostenlos testen. Kartenprüfung im Onboarding.</p>
          {resolvedCode ? (
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
              Empfohlen durch unseren Partner
              {resolvedName ? (
                <>
                  : <span className="text-emerald-400/95 font-medium">{resolvedName}</span>
                </>
              ) : null}
              <span className="block text-[10px] text-muted-foreground font-sans mt-1">{resolvedCode}</span>
            </p>
          ) : null}
          {plan !== "STARTER" && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
              Plan: {plan}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Dein Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Max Mustermann"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border text-slate-900 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Firmenname</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  name="companyName"
                  required
                  placeholder="Musterfirma GmbH"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border text-slate-900 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">E-Mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  name="email"
                  required
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
                  minLength={8}
                  placeholder="Mindestens 8 Zeichen"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border text-slate-900 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 rounded-xl bg-primary text-black font-bold flex items-center justify-center gap-2 hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(150,255,180,0.3)] transition-all disabled:opacity-60"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Konto erstellen
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Bereits registriert?{" "}
              <Link href="/auth/login" className="text-primary hover:underline">
                Anmelden
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
