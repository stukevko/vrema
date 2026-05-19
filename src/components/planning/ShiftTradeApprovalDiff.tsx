/** Vorher/Nachher bei Schicht-Tausch-Freigabe — gleiche Regel wie Zeitkorrekturen. */

export function ShiftTradeApprovalDiff({
  dayLabel,
  startTime,
  endTime,
  fromName,
  toName,
}: {
  dayLabel: string;
  startTime: string;
  endTime: string;
  fromName: string;
  toName: string;
}) {
  const slot = `${dayLabel}, ${startTime.slice(0, 5)}–${endTime.slice(0, 5)} Uhr`;

  return (
    <div
      className="mt-3 grid gap-2 sm:grid-cols-2"
      role="group"
      aria-label="Vorher und Nachher beim Schicht-Tausch"
    >
      <div className="rounded-xl border border-border/80 bg-muted/30 px-3 py-2.5 dark:border-white/10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vorher</p>
        <p className="mt-1 text-sm font-semibold text-foreground">{fromName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{slot}</p>
      </div>
      <div className="rounded-xl border border-brand/35 bg-brand-soft/80 px-3 py-2.5 dark:border-white/10 dark:bg-brand/15">
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand">Nachher</p>
        <p className="mt-1 text-sm font-semibold text-foreground">{toName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{slot} · Übernahme</p>
      </div>
    </div>
  );
}
