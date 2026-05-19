"use client";

import { Sparkles, CheckCircle2, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Props = {
  weekIndex: 1 | 2 | 3;
  draftCount: number;
  busy: boolean;
  reportLines: string[] | null;
  onSuggest: () => void;
  onPublish: () => void;
  onDiscard: () => void;
  disabled?: boolean;
};

/**
 * Schicht-Autopilot — ein klarer Weg, nicht zehn Buttons.
 * 1. Vorschlagen (Entwürfe) → 2. Prüfen → 3. Veröffentlichen
 */
export function PlannerAutopilotPanel({
  weekIndex,
  draftCount,
  busy,
  reportLines,
  onSuggest,
  onPublish,
  onDiscard,
  disabled = false,
}: Props) {
  const step = draftCount > 0 ? 2 : busy ? 1 : 1;
  const stepDone = draftCount > 0 ? 1 : 0;

  return (
    <section
      id="planner-autopilot"
      className="scroll-mt-24 rounded-2xl border border-brand/25 bg-gradient-to-br from-brand/10 via-card to-card p-4 shadow-sm dark:from-brand/15 sm:p-5"
      aria-label="Schicht-Autopilot"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand">Autopilot</p>
            <h2 className="text-base font-bold text-foreground">Woche {weekIndex} in drei Schritten</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Schlägt freie Slots vor (Ruhezeit, Urlaub, Soll-Stunden). Du prüfst — erst dann sieht das Team den Plan.
            </p>
          </div>
        </div>
      </div>

      <ol className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
        <li
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
            step >= 1 ? "border-brand/35 bg-brand/8 text-foreground" : "border-border/60 text-muted-foreground"
          }`}
        >
          {stepDone >= 1 ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" aria-hidden />
          ) : (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand/20 text-[10px] font-bold text-brand">
              1
            </span>
          )}
          Vorschlagen
        </li>
        <li
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
            draftCount > 0 ? "border-brand/35 bg-brand/8 text-foreground" : "border-border/60 text-muted-foreground"
          }`}
        >
          <Eye className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
          Prüfen
          {draftCount > 0 ? (
            <span className="ml-auto rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand">
              {draftCount}
            </span>
          ) : null}
        </li>
        <li className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-muted-foreground">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
            3
          </span>
          Live schalten
        </li>
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {draftCount === 0 ? (
          <Button
            type="button"
            variant="brand"
            size="md"
            hero
            disabled={disabled || busy}
            onClick={onSuggest}
            leadingIcon={
              busy ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
              )
            }
          >
            {busy ? "Erstelle Vorschläge…" : "Woche vorschlagen"}
          </Button>
        ) : (
          <>
            <Button type="button" variant="brand" size="md" disabled={disabled || busy} onClick={onPublish}>
              {draftCount} Entwurf{draftCount === 1 ? "" : "e"} veröffentlichen
            </Button>
            <Button type="button" variant="outline" size="md" disabled={disabled || busy} onClick={onDiscard}>
              Verwerfen
            </Button>
            <Button type="button" variant="subtle" size="md" disabled={disabled || busy} onClick={onSuggest}>
              Neu vorschlagen
            </Button>
          </>
        )}
      </div>

      {busy ? (
        <p className="mt-3 text-center text-xs font-medium text-brand">Autopilot belegt freie Schichten…</p>
      ) : null}

      {reportLines && reportLines.length > 0 ? (
        <ul className="mt-3 max-h-36 list-inside list-disc space-y-1 overflow-y-auto rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-foreground">
          {reportLines.map((line, i) => (
            <li key={`${i}-${line.slice(0, 20)}`}>{line}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
