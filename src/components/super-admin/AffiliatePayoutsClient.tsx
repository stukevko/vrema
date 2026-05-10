"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Plus, Loader2, Link2, Copy } from "lucide-react";
import type {
  SuperAdminAffiliatePayoutQueueRow,
  SuperAdminAffiliateRecentEntry,
  SuperAdminAffiliateSummary,
} from "@/lib/actions/super-admin";
import {
  createAffiliateForSuperAdmin,
  markAffiliateEarningsPaid,
} from "@/lib/actions/super-admin";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";

type Props = {
  affiliates: SuperAdminAffiliateSummary[];
  payoutQueue: SuperAdminAffiliatePayoutQueueRow[];
};

function statusDe(s: SuperAdminAffiliateRecentEntry["status"]) {
  switch (s) {
    case "PENDING":
      return "Haltefrist";
    case "AVAILABLE":
      return "Auszahlbar";
    case "PAID":
      return "Ausgezahlt";
    default:
      return s;
  }
}

function queueStatusDe(s: SuperAdminAffiliatePayoutQueueRow["status"]) {
  return s === "AVAILABLE" ? "Auszahlbar" : "Haltefrist";
}

function planDe(p: SuperAdminAffiliatePayoutQueueRow["plan"]) {
  switch (p) {
    case "STARTER":
      return "Starter";
    case "BUSINESS":
      return "Business";
    case "ENTERPRISE":
      return "Enterprise";
    default:
      return p;
  }
}

function formatCents(cents: number, currency: string) {
  const cur = currency.toUpperCase();
  const amount = (cents / 100).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (cur === "EUR") return `${amount} €`;
  return `${amount} ${cur}`;
}

export function AffiliatePayoutsClient({ affiliates, payoutQueue }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [lastCreated, setLastCreated] = useState<{ code: string; refUrl: string; tempPassword: string } | null>(null);

  const availableIds = useMemo(
    () => payoutQueue.filter((r) => r.status === "AVAILABLE").map((r) => r.id),
    [payoutQueue],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = availableIds.length > 0 && availableIds.every((id) => selected.has(id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(availableIds));
  };

  const handleMarkPaid = () => {
    setError(null);
    setSuccess(null);
    const ids = [...selected];
    if (ids.length === 0) {
      setError("Bitte mindestens eine auszahlbare Zeile auswählen.");
      return;
    }
    startTransition(async () => {
      try {
        await markAffiliateEarningsPaid(ids);
        setSelected(new Set());
        setSuccess(`${ids.length} Auszahlung(en) als erledigt markiert.`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
      }
    });
  };

  const handleCreateAffiliate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const created = await createAffiliateForSuperAdmin({
          name: newName,
          email: newEmail || null,
        });
        setNewName("");
        setNewEmail("");
        setLastCreated(created);
        setSuccess("Partner angelegt. Code und Link unten kopieren.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Anlegen fehlgeschlagen.");
      }
    });
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess("In die Zwischenablage kopiert.");
    } catch {
      setError("Kopieren nicht möglich.");
    }
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line/70 px-6 py-4 dark:border-white/10">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/30 bg-brand-soft/90 backdrop-blur dark:border-white/10 dark:bg-brand/25">
          <Wallet className="h-4 w-4 text-brand" />
        </div>
        <div>
          <h2 className="font-semibold">Affiliate & Auszahlungen</h2>
          <p className="text-xs text-muted-foreground">
            Einmal-Bounty je geworbener Firma (Starter 5 €, Business 15 €) nach erster bezahlter Abo-Rechnung; Haltefrist,
            dann manuell erledigen.
          </p>
        </div>
      </div>

      <div className="space-y-8 p-6">
        {(error || success) && (
          <div
            className={`rounded-lg border px-3 py-2 text-sm backdrop-blur-md ${
              error
                ? "border-danger/30 bg-danger-soft/85 text-danger-foreground dark:border-white/10 dark:bg-danger/22"
                : "border-brand/30 bg-brand-soft/85 text-brand dark:border-white/10 dark:bg-brand/22"
            }`}
          >
            {error ?? success}
          </div>
        )}

        <div>
          <h3 className="mb-3 text-sm font-medium text-foreground">Partner-Salden</h3>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Bounty-Modell: Starter 5,00 € · Business 15,00 € · Enterprise ohne Auto-Provision.
          </p>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface/85 backdrop-blur-md dark:border-white/10 dark:bg-surface/55">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line/70 bg-surface-muted/60 dark:border-white/10 dark:bg-surface-muted/30">
                  {["Partner", "Code", "Firmen", "Ausstehend", "Auszahlbar", "Ausgezahlt"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {affiliates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">
                      Noch keine Partner. Unten einen Code anlegen und Registrierungs-Links mit{" "}
                      <code className="text-foreground">?ref=code</code> verteilen.
                    </td>
                  </tr>
                ) : (
                  affiliates.map((a) => (
                    <Fragment key={a.id}>
                      <tr className="border-b border-line/70 hover:bg-surface-muted/50 dark:border-white/8">
                        <td className="px-4 py-3 font-medium">{a.name}</td>
                        <td className="px-4 py-3 font-sans text-xs text-muted-foreground">{a.code}</td>
                        <td className="px-4 py-3 text-muted-foreground">{a.referredCompanies}</td>
                        <td className="px-4 py-3 text-warning-foreground">{formatCents(a.pendingCents, "eur")}</td>
                        <td className="px-4 py-3 text-brand">{formatCents(a.availableCents, "eur")}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatCents(a.paidCents, "eur")}</td>
                      </tr>
                      {a.recentCommissions.length > 0 && (
                        <tr className="border-b border-line/70 bg-surface-muted/40 dark:border-white/8 dark:bg-surface-muted/20">
                          <td colSpan={6} className="px-4 py-2.5">
                            <p className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                              Letzte Bounties (max. 5)
                            </p>
                            <ul className="space-y-1 text-xs text-muted-foreground">
                              {a.recentCommissions.map((r) => (
                                <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                                  <span className="tabular-nums text-foreground">
                                    {formatCents(r.commissionCents, r.currency)}
                                  </span>
                                  <span>{planDe(r.plan)}</span>
                                  <span>{r.companyName}</span>
                                  <span>
                                    {new Date(r.createdAt).toLocaleDateString("de-DE")}
                                  </span>
                                  <span className="text-[10px]">{statusDe(r.status)}</span>
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-foreground">Anstehende Auszahlungen</h3>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleAll}
                disabled={availableIds.length === 0 || isPending}
              >
                {allSelected ? "Keine" : "Alle auszahlbar"}
              </Button>
              <Button
                type="button"
                variant="brand"
                size="sm"
                onClick={handleMarkPaid}
                disabled={selected.size === 0 || isPending}
                loading={isPending}
                leadingIcon={isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              >
                Als erledigt markieren
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface/85 backdrop-blur-md dark:border-white/10 dark:bg-surface/55">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line/70 bg-surface-muted/60 dark:border-white/10 dark:bg-surface-muted/30">
                  <th className="w-10 px-2 py-2" />
                  {["Status", "Partner", "Firma", "Plan", "Bounty", "Rechnung", "Reif ab"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payoutQueue.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-muted-foreground">
                      Keine offenen Affiliate-Buchungen.
                    </td>
                  </tr>
                ) : (
                  payoutQueue.map((row) => (
                    <tr key={row.id} className="border-b border-line/70 hover:bg-surface-muted/50 dark:border-white/8">
                      <td className="px-2 py-2 text-center">
                        {row.status === "AVAILABLE" ? (
                          <input
                            type="checkbox"
                            checked={selected.has(row.id)}
                            onChange={() => toggle(row.id)}
                            className="accent-brand"
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge
                          tone={row.status === "AVAILABLE" ? "brand" : "warning"}
                          glass
                          size="sm"
                          withDot={false}
                        >
                          {queueStatusDe(row.status)}
                        </StatusBadge>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-medium">{row.affiliate.name}</span>
                        <span className="block font-sans text-[10px] text-muted-foreground">{row.affiliate.code}</span>
                      </td>
                      <td className="px-3 py-2.5 text-foreground">{row.company.name}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{planDe(row.plan)}</td>
                      <td className="px-3 py-2.5 font-medium tabular-nums text-brand">
                        {formatCents(row.commissionCents, row.currency)}
                      </td>
                      <td className="px-3 py-2.5 font-sans text-[10px] text-muted-foreground">{row.stripeInvoiceId}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {new Date(row.maturesAt).toLocaleDateString("de-DE")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-t border-line/70 pt-6 dark:border-white/10">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <Plus className="h-4 w-4 text-muted-foreground" />
            Neuen Partner anlegen
          </h3>
          <p className="mb-3 text-[11px] text-muted-foreground">
            Ein Klick: Name eingeben → System legt einen kurzen Code fest (z. B. kevin847) und den fertigen Ref-Link.
          </p>
          <form onSubmit={handleCreateAffiliate} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Anzeigename</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Kevin"
                required
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">E-Mail</label>
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                type="email"
                placeholder="partner@…"
                required
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="submit"
                variant="brand"
                size="md"
                disabled={isPending || !newName.trim() || !newEmail.trim()}
                loading={isPending}
              >
                Partner erzeugen
              </Button>
            </div>
          </form>

          {lastCreated && (
            <div className="mt-4 space-y-3 rounded-xl border border-brand/30 bg-brand-soft/85 p-4 backdrop-blur-md dark:border-white/10 dark:bg-brand/22">
              <p className="flex items-center gap-2 text-xs font-medium text-brand">
                <Link2 className="h-3.5 w-3.5 shrink-0" />
                Ref-Link für den Partner
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="break-all rounded-lg border border-line bg-surface px-2 py-1.5 text-[11px] text-foreground">
                  {lastCreated.refUrl}
                </code>
                <button
                  type="button"
                  onClick={() => void copyText(lastCreated.refUrl)}
                  className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] text-foreground hover:bg-surface-muted"
                >
                  <Copy className="h-3 w-3" />
                  Link kopieren
                </button>
                <button
                  type="button"
                  onClick={() => void copyText(lastCreated.code)}
                  className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-surface-muted"
                >
                  Code: {lastCreated.code}
                </button>
                <button
                  type="button"
                  onClick={() => void copyText(lastCreated.tempPassword)}
                  className="inline-flex items-center gap-1 rounded-lg border border-warning/30 bg-warning-soft/90 px-2.5 py-1.5 text-[11px] text-warning-foreground backdrop-blur hover:bg-warning-soft dark:border-white/10 dark:bg-warning/22"
                >
                  Startpasswort: {lastCreated.tempPassword}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
