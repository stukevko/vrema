"use client";

import { useState } from "react";
import { Handshake } from "lucide-react";
import { ShiftTradePickColleagueSheet } from "@/components/planning/ShiftTradePickColleagueSheet";

type Props = {
  shiftId: string;
  slotLabel: string;
  disabled?: boolean;
};

export function ShiftTradeRequestButton({ shiftId, slotLabel, disabled }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted/40 disabled:opacity-50"
      >
        <Handshake className="h-3.5 w-3.5 text-brand" aria-hidden />
        An Kolleg:in senden
      </button>
      <ShiftTradePickColleagueSheet
        open={open}
        shiftId={shiftId}
        slotLabel={slotLabel}
        onClose={() => setOpen(false)}
        onSent={() => window.location.reload()}
      />
    </>
  );
}
