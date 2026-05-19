"use client";
import { userErrorMessage } from "@/lib/errors/user-message";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { inviteEmployee } from "@/lib/actions/team";
import { UserPlus, Loader2, Copy, CheckCheck, Terminal } from "lucide-react";
import { TrialInviteHint } from "@/components/dashboard/TrialInviteHint";
import { TRIAL_MAX_EMPLOYEES } from "@/lib/trial/constants";
import Link from "next/link";

export function InviteForm({
  trialActive = false,
  activeEmployees = 0,
}: {
  trialActive?: boolean;
  activeEmployees?: number;
}) {
  const atTrialLimit = trialActive && activeEmployees >= TRIAL_MAX_EMPLOYEES;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    name: string;
    email: string;
    tempPassword: string;
    terminalPin: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const form = e.currentTarget;
    const fd = new FormData(form);

    if (atTrialLimit) {
      setError(
        `Testphase: maximal ${TRIAL_MAX_EMPLOYEES} aktive Mitarbeitende. Tarif unter Abonnement wählen, um mehr Plätze zu nutzen.`,
      );
      return;
    }

    startTransition(async () => {
      try {
        const { user, tempPassword, terminalPin } = await inviteEmployee({
          name: fd.get("name") as string,
          email: fd.get("email") as string,
          role: fd.get("role") as "EMPLOYEE" | "MANAGER" | "ADVISOR",
          weeklyHours: Number(fd.get("weeklyHours")),
        });
        setResult({ name: user.name ?? "", email: user.email, tempPassword, terminalPin });
        form.reset();
      } catch (err: unknown) {
        setError(userErrorMessage(err, "Fehler beim Einladen."));
      }
    });
  };

  const copyCredentials = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(
      `VREMA Zugangsdaten\nE-Mail: ${result.email}\nPasswort: ${result.tempPassword}\nTerminal-PIN: ${result.terminalPin}\nBitte beim ersten Login ändern!`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="invite" className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)] dark:border-white/10 dark:bg-surface/90">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-5 sm:py-4">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <UserPlus className="w-4 h-4 text-[#22c55e]" />
        </div>
        <h2 className="font-semibold text-sm">Mitarbeiter einladen</h2>
      </div>

      <div className="p-4 sm:p-5 space-y-3">
        {trialActive ? (
          <TrialInviteHint activeEmployees={activeEmployees} atLimit={atTrialLimit} />
        ) : null}
        <AnimatePresence mode="wait">
          {result ? (
            /* ── Success: show temp credentials ── */
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                <p className="text-xs text-primary font-sans mb-3">✓ {result.name} wurde angelegt</p>
                <div className="rounded-lg bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-3 font-sans text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">email:</span>
                    <span className="text-foreground truncate">{result.email}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">passwort:</span>
                    <span className="text-[#22c55e] font-bold tracking-wider">{result.tempPassword}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">terminal pin:</span>
                    <span className="text-amber-300 font-bold tracking-wider">{result.terminalPin}</span>
                  </div>
                  <p className="text-muted-foreground text-[10px] pt-1">Bitte beim ersten Login ändern.</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={copyCredentials}
                  className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 font-sans text-sm transition-colors hover:bg-card/70 sm:py-2.5"
                >
                  {copied ? <CheckCheck className="w-4 h-4 text-[#22c55e]" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Kopiert!" : "Kopieren"}
                </button>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="min-h-12 flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-foreground transition-colors hover:bg-primary/90 sm:py-2.5"
                >
                  Weiteren einladen
                </button>
              </div>
            </motion.div>
          ) : (
            /* ── Form ── */
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="space-y-3"
            >
              {[
                { name: "name", label: "Name", type: "text", placeholder: "Max Mustermann" },
                { name: "email", label: "E-Mail", type: "email", placeholder: "max@firma.de" },
              ].map((f) => (
                <div key={f.name}>
                  <label className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest mb-1 block">
                    {f.label}
                  </label>
                  <input
                    name={f.name}
                    type={f.type}
                    required
                    placeholder={f.placeholder}
                    className="w-full min-w-0 px-3 py-3 sm:py-2.5 rounded-xl bg-white border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors font-sans"
                  />
                </div>
              ))}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="min-w-0">
                  <label className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest mb-1 block">Rolle</label>
                  <select
                    name="role"
                    defaultValue="EMPLOYEE"
                    className="w-full min-w-0 px-3 py-3 sm:py-2.5 rounded-xl bg-white border border-border text-foreground text-sm focus:outline-none focus:border-primary/40 transition-colors font-sans appearance-none"
                  >
                    <option value="EMPLOYEE">Mitarbeiter</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADVISOR">Berater (nur Stoß & Umsatz)</option>
                  </select>
                </div>
                <div className="min-w-0">
                  <label className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest mb-1 block">Std/Woche</label>
                  <input
                    name="weeklyHours"
                    type="number"
                    defaultValue={40}
                    min={1}
                    max={60}
                    className="w-full min-w-0 px-3 py-3 sm:py-2.5 rounded-xl bg-white border border-border text-foreground text-sm focus:outline-none focus:border-primary/40 transition-colors font-sans"
                  />
                </div>
              </div>

              {error && (
                <div className="space-y-2 rounded-lg border border-red-500/10 bg-red-500/5 px-3 py-2 text-xs font-sans text-red-400">
                  <p>✗ {error}</p>
                  {error.includes("Testphase") ? (
                    <Link href="/dashboard/billing" className="inline-flex font-semibold text-brand underline-offset-2 hover:underline">
                      Tarif wählen
                    </Link>
                  ) : null}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending || atTrialLimit}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-sans text-sm font-bold text-foreground transition-all hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(150,255,180,0.3)] disabled:opacity-60 sm:py-3"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                {isPending ? "Wird angelegt..." : "$ invite --send"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
