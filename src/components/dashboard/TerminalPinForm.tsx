"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { setTerminalPin } from "@/lib/actions/settings";
import { ToastContainer, useToast } from "@/components/ui/Toast";

export function TerminalPinForm() {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toasts, show, remove } = useToast();

  const submit = () => {
    setError(null);
    setSuccess(null);
    if (!/^\d{4}$/.test(pin)) {
      const message = "PIN muss genau 4 Ziffern haben.";
      setError(message);
      show(message, "error");
      return;
    }
    if (pin !== confirmPin) {
      const message = "PIN-Eingaben stimmen nicht überein.";
      setError(message);
      show(message, "error");
      return;
    }

    startTransition(async () => {
      try {
        await setTerminalPin({ pin });
        setSuccess("Terminal-PIN wurde sicher gespeichert.");
        show("Terminal-PIN erfolgreich aktualisiert.", "success");
        setPin("");
        setConfirmPin("");
      } catch (err) {
        const message = err instanceof Error ? err.message : "PIN konnte nicht gespeichert werden.";
        setError(message);
        show(message, "error");
      }
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-6">
      <p className="text-sm text-muted-foreground">
        4-stellige PIN fürs Terminal. Die PIN wird nur als Hash gespeichert.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          pattern="\d{4}"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="PIN"
          className="min-h-12 rounded-xl border border-border bg-white px-4 py-2.5 text-base tracking-[0.25em] sm:text-sm"
        />
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          pattern="\d{4}"
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
          placeholder="PIN bestätigen"
          className="min-h-12 rounded-xl border border-border bg-white px-4 py-2.5 text-base tracking-[0.25em] sm:text-sm"
        />
      </div>
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
      {success ? <p className="text-xs text-primary">{success}</p> : null}
      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        PIN speichern
      </button>
      <ToastContainer toasts={toasts} remove={remove} />
    </div>
  );
}
