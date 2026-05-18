"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import Link from "next/link";

export function TerminalLinkCard({ terminalUrl }: { terminalUrl: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(terminalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <p className="text-sm font-semibold text-foreground">Terminal-Link fürs Tablet</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Diese URL am Küchen- oder Service-Tablet als Lesezeichen öffnen. Danach nur noch PIN eingeben — kein GPS.
      </p>
      <p className="mt-3 break-all rounded-lg border border-border bg-muted/30 px-3 py-2 font-mono text-xs text-foreground">
        {terminalUrl}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Kopiert" : "Link kopieren"}
        </button>
        <Link
          href={terminalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-brand px-3 text-xs font-semibold text-brand-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Terminal öffnen
        </Link>
      </div>
    </div>
  );
}
