"use client";

import { useState, useTransition } from "react";
import { importWeeklyRevenueCsv } from "@/lib/actions/revenue";
import { userErrorMessage } from "@/lib/errors/user-message";
import { toast } from "sonner";
import { Upload } from "lucide-react";

const SAMPLE = "8500\n9200\n7800\n10500";

export function RevenueCsvImport() {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      try {
        const res = await importWeeklyRevenueCsv(text.trim() || SAMPLE);
        toast.success(res.message);
        setText("");
      } catch (e: unknown) {
        toast.error(userErrorMessage(e, "Import fehlgeschlagen."));
      }
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background/50 p-4">
      <div className="flex items-start gap-2">
        <Upload className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-foreground">Umsatz aus CSV (optional)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Eine Zahl pro Zeile — wir speichern den Durchschnitt als Wochenumsatz für Personalquote und Tipps.
          </p>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={SAMPLE}
        rows={4}
        className="input-field-subtle w-full rounded-xl px-3 py-2 font-mono text-xs"
      />
      <button
        type="button"
        disabled={pending}
        onClick={run}
        className="btn-secondary-outline min-h-10 rounded-xl px-4 text-xs font-semibold disabled:opacity-60"
      >
        {pending ? "Importiere…" : "Umsatz importieren"}
      </button>
    </div>
  );
}
