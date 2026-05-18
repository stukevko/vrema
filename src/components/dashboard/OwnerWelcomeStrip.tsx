"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Timer, Users, X } from "lucide-react";
import { TRIAL_DAYS, TRIAL_MAX_EMPLOYEES } from "@/lib/trial/constants";

const DISMISS_KEY = "vrema_owner_welcome_dismissed";

export function OwnerWelcomeStrip({ focusWeek }: { focusWeek?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  const planningHref =
    focusWeek && focusWeek >= 1 && focusWeek <= 3
      ? `/dashboard/planning?focusWeek=${focusWeek}`
      : "/dashboard/planning?focusWeek=1";

  return (
    <section className="order-1 rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/12 via-card to-card p-5 shadow-sm dark:from-brand/18">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">Startklar in 3 Schritten</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight">Willkommen — so nutzt du die Testphase</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {TRIAL_DAYS} Tage, bis zu {TRIAL_MAX_EMPLOYEES} Mitarbeitende. Keine Kreditkarte zum Start.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(DISMISS_KEY, "1");
            } catch {
              /* ignore */
            }
            setVisible(false);
          }}
          className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted/60"
          aria-label="Hinweis ausblenden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <ol className="mt-4 space-y-2 text-sm">
        <li className="flex gap-3 rounded-xl border border-border/60 bg-background/50 px-3 py-2.5">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
          <span>
            <strong className="text-foreground">Team einladen</strong> — unter Team bis zu {TRIAL_MAX_EMPLOYEES} Leute
            anlegen.
          </span>
        </li>
        <li className="flex gap-3 rounded-xl border border-border/60 bg-background/50 px-3 py-2.5">
          <Timer className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
          <span>
            <strong className="text-foreground">Terminal einrichten</strong> — Link in den Einstellungen, PIN am
            Tablet.
          </span>
        </li>
        <li className="flex gap-3 rounded-xl border border-border/60 bg-background/50 px-3 py-2.5">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
          <span>
            <strong className="text-foreground">Woche planen</strong> — Schichten für die kommende Woche eintragen.
          </span>
        </li>
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/dashboard/team#invite" className="btn-primary-solid inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-semibold">
          Team einladen
        </Link>
        <Link
          href="/dashboard/settings"
          className="btn-secondary-outline inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-semibold"
        >
          Terminal-Link
        </Link>
        <Link href={planningHref} className="btn-secondary-outline inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-semibold">
          Woche planen
        </Link>
      </div>
    </section>
  );
}
