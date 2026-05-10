"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthBrandLogo } from "@/components/brand/AuthBrandLogo";
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
  inviteContext: {
    code: string;
    orgId: string;
    role: "USER" | "MANAGER";
    orgName: string;
  } | null;
};

export function RegisterClient({ initialPlan, refCode, affiliatePartnerName, inviteContext }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const plan = initialPlan;
  const isInviteFlow = inviteContext !== null;

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
            name: isInviteFlow
              ? `${String(data.get("firstName") ?? "").trim()} ${String(data.get("lastName") ?? "").trim()}`.trim()
              : data.get("name"),
            email: data.get("email"),
            password: data.get("password"),
            companyName: isInviteFlow ? undefined : data.get("companyName"),
            plan,
            affiliateCode: resolvedCode || undefined,
            inviteCode: inviteContext?.code,
            inviteOrgId: inviteContext?.orgId,
            inviteRole: inviteContext?.role,
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

        const loginTarget = isInviteFlow
          ? `/auth/login?registered=1&callbackUrl=${encodeURIComponent("/dashboard/welcome")}`
          : "/auth/login?registered=1";
        router.push(loginTarget);
      } catch {
        setError("Ein unerwarteter Fehler ist aufgetreten.");
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {isInviteFlow ? `Registrierung als ${inviteContext?.role === "MANAGER" ? "Manager" : "Mitarbeiter"}` : "Konto erstellen"}
          </h1>
          <p className="mt-1.5 text-sm text-fg-muted">
            {isInviteFlow
              ? `Sie registrieren sich für ${inviteContext?.orgName}.`
              : "14 Tage kostenlos testen. Kartenprüfung im Onboarding."}
          </p>
          {!isInviteFlow && resolvedCode ? (
            <p className="mt-3 text-xs leading-relaxed text-fg-muted">
              Empfohlen durch unseren Partner
              {resolvedName ? (
                <>
                  : <span className="font-semibold text-brand">{resolvedName}</span>
                </>
              ) : null}
              <span className="mt-0.5 block font-mono text-[10px] text-fg-subtle">{resolvedCode}</span>
            </p>
          ) : null}
          {!isInviteFlow && plan !== "STARTER" && (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
              Plan: {plan}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {isInviteFlow ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-muted">Vorname</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
                    <input
                      type="text"
                      name="firstName"
                      required
                      autoComplete="given-name"
                      placeholder="Max"
                      className="w-full rounded-xl py-3 pl-10 pr-4 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-muted">Nachname</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
                    <input
                      type="text"
                      name="lastName"
                      required
                      autoComplete="family-name"
                      placeholder="Mustermann"
                      className="w-full rounded-xl py-3 pl-10 pr-4 text-sm"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-muted">Ihr Name</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
                    <input
                      type="text"
                      name="name"
                      required
                      autoComplete="name"
                      placeholder="Max Mustermann"
                      className="w-full rounded-xl py-3 pl-10 pr-4 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-muted">Firmenname</label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
                    <input
                      type="text"
                      name="companyName"
                      required
                      autoComplete="organization"
                      placeholder="Musterfirma GmbH"
                      className="w-full rounded-xl py-3 pl-10 pr-4 text-sm"
                    />
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-muted">E-Mail</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
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
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Mindestens 8 Zeichen"
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
              {isPending ? "Lädt..." : "Konto erstellen"}
            </button>
          </form>

          <div className="mt-7 border-t border-line pt-6 text-center">
            <p className="text-sm text-fg-muted">
              Bereits registriert?{" "}
              <Link href="/auth/login" className="font-semibold text-brand hover:underline">
                Anmelden
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
