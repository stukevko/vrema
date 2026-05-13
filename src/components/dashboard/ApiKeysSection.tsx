"use client";

import { useState, useTransition } from "react";
import { createApiKey, deleteApiKey, revokeApiKey } from "@/lib/actions/api-keys";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tooltip } from "@/components/ui/Tooltip";
import { Copy, KeyRound, Loader2, Plus, ShieldX, Trash2 } from "lucide-react";

type ApiKeyRow = {
  id: string;
  name: string;
  keyHint: string;
  scopes: string[];
  isActive: boolean;
  createdAt: Date | string;
  lastUsedAt: Date | string | null;
  expiresAt: Date | string | null;
};

type Props = {
  apiKeys: ApiKeyRow[];
};

function formatDate(d: Date | string | null) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ApiKeysSection({ apiKeys }: Props) {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [revealed, setRevealed] = useState<{ id: string; name: string; key: string } | null>(null);
  const { toasts, show, remove } = useToast();

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) {
      show("Bitte einen Namen vergeben.", "error");
      return;
    }
    startTransition(async () => {
      try {
        const issued = await createApiKey({ name: name.trim(), scopes: ["status:read"] });
        setRevealed({ id: issued.id, name: issued.name, key: issued.plainKey });
        setName("");
        show("API-Key erstellt — Klartext wird nur einmal angezeigt.", "success");
      } catch (err) {
        show(err instanceof Error ? err.message : "Erstellung fehlgeschlagen.", "error");
      }
    });
  };

  const handleRevoke = (id: string) => {
    startTransition(async () => {
      try {
        await revokeApiKey(id);
        show("Key deaktiviert.", "success");
      } catch (err) {
        show(err instanceof Error ? err.message : "Fehler beim Revoken.", "error");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Diesen API-Key endgültig löschen? Externe Integrationen verlieren sofort den Zugriff.")) return;
    startTransition(async () => {
      try {
        await deleteApiKey(id);
        show("Key gelöscht.", "success");
      } catch (err) {
        show(err instanceof Error ? err.message : "Fehler beim Löschen.", "error");
      }
    });
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      show("In Zwischenablage kopiert.", "success");
    } catch {
      show("Kopieren fehlgeschlagen.", "error");
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="min-w-0">
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Name für den neuen Key
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Buchhaltungs-Software"
            className="input-field-subtle h-11 w-full rounded-xl px-3 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="btn-brand inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          API-Key erstellen
        </button>
      </form>

      {revealed && (
        <div className="rounded-xl border border-amber-300/40 bg-amber-50/70 p-4 dark:border-amber-300/15 dark:bg-amber-500/10">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-200" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                „{revealed.name}" — Klartext-Key sichtbar (nur einmal)
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="block truncate rounded-lg bg-white/80 px-3 py-2 font-mono text-xs text-amber-900 dark:bg-black/30 dark:text-amber-100">
                  {revealed.key}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(revealed.key)}
                  className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-amber-400/50 bg-white/70 px-3 text-xs font-semibold text-amber-900 hover:bg-white dark:border-amber-300/30 dark:bg-black/30 dark:text-amber-100"
                >
                  <Copy className="h-3.5 w-3.5" /> Kopieren
                </button>
              </div>
              <p className="text-xs text-amber-900/85 dark:text-amber-100/80">
                Bitte sofort sicher speichern. Aus Sicherheitsgründen können wir den Klartext nicht erneut anzeigen — bei Verlust einfach Key revoken und neuen erstellen.
              </p>
              <button
                type="button"
                onClick={() => setRevealed(null)}
                className="text-xs font-semibold text-amber-900 underline-offset-2 hover:underline dark:text-amber-100"
              >
                Bestätigen &amp; ausblenden
              </button>
            </div>
          </div>
        </div>
      )}

      {apiKeys.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="Noch keine API-Keys angelegt"
          description="API-Keys verbinden externe Software (Buchhaltung, Dashboards, BI-Tools) mit der VREMA External API – ohne Login."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line/60 bg-surface/70 dark:border-white/[0.06] dark:bg-surface/50">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Hint</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden md:table-cell">Erstellt</th>
                <th className="px-4 py-3 hidden md:table-cell">Letzte Nutzung</th>
                <th className="px-4 py-3 text-right">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((k) => (
                <tr key={k.id} className="border-t border-line/40 dark:border-white/[0.04]">
                  <td className="px-4 py-3 font-medium text-foreground">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    <Tooltip content="Die letzten 4 Zeichen des Klartext-Keys zur Wiedererkennung. Voller Key wird nie wieder angezeigt.">
                      <span className="cursor-help">…{k.keyHint}</span>
                    </Tooltip>
                  </td>
                  <td className="px-4 py-3">
                    {k.isActive ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                        Aktiv
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-white/5 dark:text-slate-300">
                        Revoked
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                    {formatDate(k.createdAt)}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                    {formatDate(k.lastUsedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      {k.isActive && (
                        <button
                          type="button"
                          onClick={() => handleRevoke(k.id)}
                          disabled={isPending}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-amber-300/40 bg-amber-50/60 px-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-300/20 dark:bg-amber-500/10 dark:text-amber-200"
                          title="Revoken (Key sofort deaktivieren)"
                        >
                          <ShieldX className="h-3.5 w-3.5" /> Revoke
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(k.id)}
                        disabled={isPending}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-300/40 bg-rose-50/60 px-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-300/20 dark:bg-rose-500/10 dark:text-rose-200"
                        title="Endgültig löschen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Endpoint: <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[11px]">GET /api/v1/external/status</code>
        {" · Header: "}
        <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[11px]">x-api-key: vrema_live_…</code>
      </p>

      <ToastContainer toasts={toasts} remove={remove} />
    </div>
  );
}
