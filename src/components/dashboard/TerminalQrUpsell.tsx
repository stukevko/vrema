import Link from "next/link";
import { QrCode, Lock } from "lucide-react";
import { planDisplayName } from "@/lib/plan-features";

export function TerminalQrUpsell({
  plan,
  globallyOff,
  needsUpgrade,
}: {
  plan: string;
  globallyOff: boolean;
  needsUpgrade: boolean;
}) {

  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          {globallyOff ? (
            <QrCode className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Lock className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">QR-Code fürs Terminal</p>
          {globallyOff ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Vorbereitet — wird für euren Betrieb noch nicht angezeigt. Terminal-Link und PIN reichen vorerst.
              Freischaltung auf Anfrage oder mit passendem Tarif.
            </p>
          ) : needsUpgrade ? (
            <p className="mt-1 text-xs text-muted-foreground">
              QR zum Ausdrucken am Stempel-Tablet ist in Petite & Major enthalten (aktuell:{" "}
              {planDisplayName(plan)}). Link kopieren funktioniert in jedem Tarif.
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Für euren Tarif vorgesehen — Feature wird derzeit noch nicht ausgerollt. Terminal-Link nutzen.
            </p>
          )}
          {needsUpgrade && !globallyOff ? (
            <Link
              href="/dashboard/billing"
              className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-brand px-3 text-xs font-semibold text-brand-foreground"
            >
              Tarif vergleichen
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
