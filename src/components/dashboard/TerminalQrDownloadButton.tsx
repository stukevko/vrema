"use client";

import { Download } from "lucide-react";

export function TerminalQrDownloadButton({ dataUrl }: { dataUrl: string }) {
  return (
    <a
      href={dataUrl}
      download="vrema-terminal-qr.png"
      className="inline-flex min-h-10 w-fit items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground"
    >
      <Download className="h-3.5 w-3.5" />
      PNG herunterladen
    </a>
  );
}
