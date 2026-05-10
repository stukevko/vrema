"use client";

import { useState, useTransition } from "react";
import { validatePinAndClock } from "@/lib/actions/terminal";

const DEFAULT_TERMINAL_SLUG = process.env.NEXT_PUBLIC_TERMINAL_DEFAULT_SLUG ?? "";

export default function TerminalIndexPage() {
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("PIN eingeben");
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    if (!DEFAULT_TERMINAL_SLUG) {
      setMessage("Terminal-Slug fehlt. Bitte Konfiguration setzen.");
      return;
    }
    startTransition(async () => {
      const result = await validatePinAndClock(DEFAULT_TERMINAL_SLUG, pin);
      setMessage(result.message);
      setPin("");
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <p className="text-xs font-sans uppercase tracking-widest text-muted-foreground mb-2 text-center">VREMA Terminal</p>
        <h1 className="text-xl font-bold mb-2 text-center">PIN-Login</h1>
        <p className="text-sm text-muted-foreground mb-5 text-center">{message}</p>
        <input
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="w-full rounded-xl px-4 py-3 text-center text-2xl tracking-[0.35em]"
          placeholder="----"
        />
        <button
          type="button"
          onClick={submit}
          disabled={isPending || pin.length < 4}
          className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-foreground disabled:opacity-60"
        >
          {isPending ? "Prüfe..." : "Stempeln"}
        </button>
      </div>
    </div>
  );
}
