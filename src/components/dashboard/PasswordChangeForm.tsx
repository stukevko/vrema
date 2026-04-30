"use client";

import { useState, useTransition } from "react";
import { changePassword } from "@/lib/actions/settings";
import { Loader2, Lock, Eye, EyeOff } from "lucide-react";

export function PasswordChangeForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    const newPw = fd.get("newPassword") as string;
    const confirm = fd.get("confirmPassword") as string;

    if (newPw !== confirm) {
      setError("Passwörter stimmen nicht überein.");
      return;
    }

    startTransition(async () => {
      try {
        await changePassword({
          currentPassword: fd.get("currentPassword") as string,
          newPassword: newPw,
        });
        setSuccess(true);
        (e.target as HTMLFormElement).reset();
        setTimeout(() => setSuccess(false), 4000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Fehler beim Ändern.");
      }
    });
  };

  const fields = [
    { name: "currentPassword", label: "Aktuelles Passwort", show: showCurrent, toggle: () => setShowCurrent((v) => !v) },
    { name: "newPassword", label: "Neues Passwort", show: showNew, toggle: () => setShowNew((v) => !v) },
    { name: "confirmPassword", label: "Passwort bestätigen", show: showNew, toggle: () => setShowNew((v) => !v) },
  ];

  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((f) => (
          <div key={f.name}>
            <label className="text-[10px] text-white/40 font-sans uppercase tracking-widest mb-1.5 block">
              {f.label}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                name={f.name}
                type={f.show ? "text" : "password"}
                required
                minLength={f.name !== "currentPassword" ? 8 : 1}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-card border border-border text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors"
              />
              <button
                type="button"
                onClick={f.toggle}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
              >
                {f.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}

        {error && (
          <p className="text-xs text-red-400 font-sans bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2">
            ✗ {error}
          </p>
        )}
        {success && (
          <p className="text-xs text-primary font-sans bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
            ✓ Passwort erfolgreich geändert.
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-colors disabled:opacity-60"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          Passwort ändern
        </button>
      </form>
    </div>
  );
}
