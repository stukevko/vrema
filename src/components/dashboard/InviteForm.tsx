"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { inviteEmployee } from "@/lib/actions/team";
import { UserPlus, Loader2, Copy, CheckCheck, Terminal } from "lucide-react";

export function InviteForm() {
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

    startTransition(async () => {
      try {
        const { user, tempPassword, terminalPin } = await inviteEmployee({
          name: fd.get("name") as string,
          email: fd.get("email") as string,
          role: fd.get("role") as "EMPLOYEE" | "MANAGER",
          weeklyHours: Number(fd.get("weeklyHours")),
        });
        setResult({ name: user.name ?? "", email: user.email, tempPassword, terminalPin });
        form.reset();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Fehler beim Einladen.");
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
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <UserPlus className="w-4 h-4 text-[#22c55e]" />
        </div>
        <h2 className="font-semibold text-sm">Mitarbeiter einladen</h2>
      </div>

      <div className="p-5">
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
                <div className="rounded-lg bg-card border border-white/5 p-3 font-sans text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white/30">email:</span>
                    <span className="text-white/70 truncate">{result.email}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white/30">passwort:</span>
                    <span className="text-[#22c55e] font-bold tracking-wider">{result.tempPassword}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white/30">terminal pin:</span>
                    <span className="text-amber-300 font-bold tracking-wider">{result.terminalPin}</span>
                  </div>
                  <p className="text-white/20 text-[10px] pt-1">Bitte beim ersten Login ändern.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyCredentials}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-card hover:bg-card/70 border border-border text-sm font-sans transition-colors"
                >
                  {copied ? <CheckCheck className="w-4 h-4 text-[#22c55e]" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Kopiert!" : "Kopieren"}
                </button>
                <button
                  onClick={() => setResult(null)}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-black text-sm font-bold hover:bg-primary/90 transition-colors"
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
                  <label className="text-[10px] text-white/40 font-sans uppercase tracking-widest mb-1 block">
                    {f.label}
                  </label>
                  <input
                    name={f.name}
                    type={f.type}
                    required
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors font-sans"
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-white/40 font-sans uppercase tracking-widest mb-1 block">Rolle</label>
                  <select
                    name="role"
                    defaultValue="EMPLOYEE"
                    className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-white text-sm focus:outline-none focus:border-primary/40 transition-colors font-sans appearance-none"
                  >
                    <option value="EMPLOYEE">Mitarbeiter</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-white/40 font-sans uppercase tracking-widest mb-1 block">Std/Woche</label>
                  <input
                    name="weeklyHours"
                    type="number"
                    defaultValue={40}
                    min={1}
                    max={60}
                    className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-white text-sm focus:outline-none focus:border-primary/40 transition-colors font-sans"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-400 font-sans bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2">
                  ✗ {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(150,255,180,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-60 font-sans"
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
