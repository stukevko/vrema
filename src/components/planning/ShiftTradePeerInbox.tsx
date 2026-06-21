"use client";

import { useTransition } from "react";
import { Handshake } from "lucide-react";
import {
  planningRespondPeerTradeFormAction,
} from "@/app/(dashboard)/dashboard/planning/planning-trade-actions";

export type ShiftTradePeerRequest = {
  id: string;
  fromName: string;
  slotLabel: string;
  isSwap: boolean;
  counterSlotLabel: string | null;
};

export function ShiftTradePeerInbox({ requests }: { requests: ShiftTradePeerRequest[] }) {
  const [pending, startTransition] = useTransition();

  if (requests.length === 0) return null;

  const respond = (shiftId: string, accept: boolean) => {
    const fd = new FormData();
    fd.set("shiftId", shiftId);
    fd.set("accept", accept ? "true" : "false");
    startTransition(async () => {
      await planningRespondPeerTradeFormAction(fd);
      window.location.reload();
    });
  };

  return (
    <section className="glass-card space-y-3 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Handshake className="h-4 w-4 text-brand" aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">Anfragen an dich</h2>
      </div>
      <p className="text-xs text-muted-foreground">Wie früher /tpaccept — annehmen oder ablehnen, danach prüft dein Chef.</p>
      <ul className="space-y-2">
        {requests.map((req) => (
          <li key={req.id} className="rounded-xl border border-brand/25 bg-brand-soft/30 px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              <span className="font-semibold">{req.fromName}</span>
              {req.isSwap ? " möchte tauschen" : " möchte dir übergeben"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {req.slotLabel}
              {req.isSwap && req.counterSlotLabel ? ` ↔ ${req.counterSlotLabel}` : ""}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => respond(req.id, true)}
                className="btn-brand min-h-10 rounded-xl px-4 text-xs font-semibold disabled:opacity-50"
              >
                Annehmen
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => respond(req.id, false)}
                className="btn-outline min-h-10 rounded-xl px-4 text-xs font-semibold disabled:opacity-50"
              >
                Ablehnen
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
