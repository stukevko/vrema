"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import {
  listMySupportTickets,
  markSupportTicketReplySeen,
} from "@/lib/actions/support";
import { ticketTypeDe } from "@/lib/support/ticket-labels";
import { SupportTicketCreateForm } from "@/components/dashboard/SupportTicketCreateForm";
import type { TicketStatus, TicketType } from "@prisma/client";

export type SupportTicketRow = {
  id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  type: TicketType;
  response: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  userSeenResponseAt: Date | null;
};

type View = "list" | "detail" | "create";

type Props = {
  variant: "modal" | "page";
  /** Beim Öffnen direkt erste ungelesene Admin-Antwort anzeigen (Badge-Klick). */
  initialFocusUnread?: boolean;
  onInitialFocusUnreadConsumed?: () => void;
  /** Nach Lesen/Erstellen Badge & Banner aktualisieren */
  onActivity?: () => void;
  /** Erfolg nur im Modal: Toast über Overlay */
  onCreatedToast?: (message: string) => void;
  onCreateErrorToast?: (message: string) => void;
};

function isUnreadReply(t: SupportTicketRow) {
  return Boolean(t.response && t.respondedAt && !t.userSeenResponseAt);
}

function statusBucketDe(status: TicketStatus): "Offen" | "Beantwortet" | "Geschlossen" {
  if (status === "CLOSED") return "Geschlossen";
  if (status === "RESOLVED") return "Beantwortet";
  return "Offen";
}

export function SupportTicketInbox({
  variant,
  initialFocusUnread = false,
  onInitialFocusUnreadConsumed,
  onActivity,
  onCreatedToast,
  onCreateErrorToast,
}: Props) {
  const [tickets, setTickets] = useState<SupportTicketRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<View>("list");
  const [selected, setSelected] = useState<SupportTicketRow | null>(null);
  const appliedUnreadFocusRef = useRef(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const rows = await listMySupportTickets();
      setTickets(rows as SupportTicketRow[]);
      return rows as SupportTicketRow[];
    } catch {
      setLoadError("Tickets konnten nicht geladen werden.");
      setTickets([]);
      return [];
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!initialFocusUnread) {
      appliedUnreadFocusRef.current = false;
      return;
    }
    if (tickets === null) return;
    if (appliedUnreadFocusRef.current) return;
    appliedUnreadFocusRef.current = true;

    const first = tickets.find(isUnreadReply);
    if (first) {
      setSelected(first);
      setView("detail");
      void markSupportTicketReplySeen(first.id).then(() => {
        onActivity?.();
        void load();
      });
    }
    onInitialFocusUnreadConsumed?.();
  }, [initialFocusUnread, tickets, load, onActivity, onInitialFocusUnreadConsumed]);

  const openDetail = (t: SupportTicketRow) => {
    setSelected(t);
    setView("detail");
    if (isUnreadReply(t)) {
      void markSupportTicketReplySeen(t.id).then(() => {
        onActivity?.();
        void load();
      });
    }
  };

  const goList = () => {
    setSelected(null);
    setView("list");
    void load();
  };

  const busy = tickets === null;

  return (
    <div className={variant === "modal" ? "space-y-4" : "space-y-6"}>
      {view === "list" && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Meine Tickets</h2>
              <p className="text-xs text-muted-foreground">
                Übersicht und Antworten vom Support – Status: Offen, Beantwortet oder Geschlossen.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setView("create")}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-white/15 transition-colors hover:bg-primary/90 active:scale-[0.99]"
            >
              Neues Ticket erstellen
            </button>
          </div>

          {loadError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{loadError}</p>
          ) : null}

          {busy ? (
            <div className="space-y-2">
              <div className="h-14 animate-pulse rounded-2xl bg-muted/60" />
              <div className="h-14 animate-pulse rounded-2xl bg-muted/40" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/60 px-4 py-10 text-center text-sm text-muted-foreground">
              Noch keine Tickets. Oben kannst du eine neue Anfrage starten.
            </div>
          ) : (
            <ul className="space-y-2">
              {tickets.map((t) => {
                const unread = isUnreadReply(t);
                const bucket = statusBucketDe(t.status);
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => openDetail(t)}
                      className="flex w-full flex-col gap-1 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/25 hover:bg-muted/20 active:scale-[0.99]"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                          {ticketTypeDe(t.type)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            bucket === "Offen"
                              ? "bg-amber-100 text-amber-900"
                              : bucket === "Beantwortet"
                                ? "bg-sky-100 text-sky-900"
                                : "bg-slate-200 text-slate-800"
                          }`}
                        >
                          {bucket}
                        </span>
                        {unread ? (
                          <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-foreground">
                            Neue Antwort
                          </span>
                        ) : null}
                      </div>
                      <p className="font-semibold text-foreground">{t.subject}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{t.message}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(t.createdAt).toLocaleString("de-DE")}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {view === "detail" && selected && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goList}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-foreground hover:bg-muted/40"
              aria-label="Zurück zur Liste"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-semibold">{selected.subject}</h2>
              <p className="text-[11px] text-muted-foreground">
                {ticketTypeDe(selected.type)} · {new Date(selected.createdAt).toLocaleString("de-DE")}
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <MessageCircle className="h-4 w-4" aria-hidden />
              Deine Nachricht
            </div>
            <p className="whitespace-pre-wrap text-sm text-foreground">{selected.message}</p>
          </div>

          {selected.response && selected.respondedAt ? (
            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Antwort vom Support</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{selected.response}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {new Date(selected.respondedAt).toLocaleString("de-DE")}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Noch keine Antwort – wir melden uns.</p>
          )}
        </div>
      )}

      {view === "create" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goList}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-foreground hover:bg-muted/40"
              aria-label="Zurück zur Liste"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="text-base font-semibold">Neues Ticket</h2>
          </div>
          <SupportTicketCreateForm
            onSuccess={() => {
              onCreatedToast?.("Ticket erstellt. Wir melden uns im Verlauf.");
              goList();
              onActivity?.();
            }}
            onError={(msg) => {
              onCreateErrorToast?.(msg);
            }}
          />
        </div>
      )}
    </div>
  );
}
