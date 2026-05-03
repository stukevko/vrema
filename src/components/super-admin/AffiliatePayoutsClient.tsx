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
    <div className="rounded-2xl bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <Wallet className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h2 className="font-semibold">Affiliate & Auszahlungen</h2>
          <p className="text-xs text-muted-foreground">
            Einmal-Bounty je geworbener Firma (Starter 5 €, Business 15 €) nach erster bezahlter Abo-Rechnung; Haltefrist,
            dann manuell erledigen.
          </p>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {(error || success) && (
          <div
            className={`text-sm px-3 py-2 rounded-lg border ${
              error
                ? "text-red-600 bg-red-50 border-red-200"
                : "text-emerald-700 bg-emerald-50 border-emerald-200"
            }`}
          >
            {error ?? success}
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Partner-Salden</h3>
          <p className="text-[11px] text-muted-foreground mb-2">
            Bounty-Modell: Starter 5,00 € · Business 15,00 € · Enterprise ohne Auto-Provision.
          </p>
          <div className="overflow-x-auto rounded-xl border border-border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card">
                  {["Partner", "Code", "Firmen", "Ausstehend", "Auszahlbar", "Ausgezahlt"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {affiliates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-muted-foreground text-center text-sm">
                      Noch keine Partner. Unten einen Code anlegen und Registrierungs-Links mit{" "}
                      <code className="text-foreground">?ref=code</code> verteilen.
                    </td>
                  </tr>
                ) : (
                  affiliates.map((a) => (
                    <Fragment key={a.id}>
                      <tr className="border-b border-border hover:bg-card/70">
                        <td className="px-4 py-3 font-medium">{a.name}</td>
                        <td className="px-4 py-3 font-sans text-xs text-muted-foreground">{a.code}</td>
                        <td className="px-4 py-3 text-muted-foreground">{a.referredCompanies}</td>
                        <td className="px-4 py-3 text-amber-700">{formatCents(a.pendingCents, "eur")}</td>
                        <td className="px-4 py-3 text-emerald-700">{formatCents(a.availableCents, "eur")}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatCents(a.paidCents, "eur")}</td>
                      </tr>
                      {a.recentCommissions.length > 0 && (
                        <tr className="border-b border-border bg-card/70">
                          <td colSpan={6} className="px-4 py-2.5">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                              Letzte Bounties (max. 5)
                            </p>
                            <ul className="space-y-1 text-xs text-muted-foreground">
                              {a.recentCommissions.map((r) => (
                                <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                                  <span className="text-foreground tabular-nums">
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
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h3 className="text-sm font-medium text-foreground">Anstehende Auszahlungen</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleAll}
                disabled={availableIds.length === 0 || isPending}
                className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-card disabled:opacity-40"
              >
                {allSelected ? "Keine" : "Alle auszahlbar"}
              </button>
              <button
                type="button"
                onClick={handleMarkPaid}
                disabled={selected.size === 0 || isPending}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary text-foreground font-semibold hover:bg-primary/90 disabled:opacity-40 flex items-center gap-1.5"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Als erledigt markieren
              </button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="w-10 px-2 py-2" />
                  {["Status", "Partner", "Firma", "Plan", "Bounty", "Rechnung", "Reif ab"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs text-muted-foreground font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payoutQueue.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-muted-foreground text-center text-sm">
                      Keine offenen Affiliate-Buchungen.
                    </td>
                  </tr>
                ) : (
                  payoutQueue.map((row) => (
                    <tr key={row.id} className="border-b border-border hover:bg-card/70">
                      <td className="px-2 py-2 text-center">
                        {row.status === "AVAILABLE" ? (
                          <input
                            type="checkbox"
                            checked={selected.has(row.id)}
                            onChange={() => toggle(row.id)}
                            className="accent-emerald-500"
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={
                            row.status === "AVAILABLE"
                              ? "text-emerald-700 text-xs font-medium"
                              : "text-amber-700 text-xs font-medium"
                          }
                        >
                          {queueStatusDe(row.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-medium">{row.affiliate.name}</span>
                        <span className="block text-[10px] text-muted-foreground font-sans">{row.affiliate.code}</span>
                      </td>
                      <td className="px-3 py-2.5 text-foreground">{row.company.name}</td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{planDe(row.plan)}</td>
                      <td className="px-3 py-2.5 text-emerald-700 font-medium tabular-nums">
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

        <div className="border-t border-border pt-6">
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-muted-foreground" />
            Neuen Partner anlegen
          </h3>
          <p className="text-[11px] text-muted-foreground mb-3">
            Ein Klick: Name eingeben → System legt einen kurzen Code fest (z. B. kevin847) und den fertigen Ref-Link.
          </p>
          <form onSubmit={handleCreateAffiliate} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Anzeigename</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Kevin"
                required
                className="mt-1 w-full px-3 py-2 rounded-lg bg-white border border-border text-sm text-foreground"
              />
            </div>
            <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">E-Mail</label>
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                type="email"
                placeholder="partner@…"
                  required
                className="mt-1 w-full px-3 py-2 rounded-lg bg-white border border-border text-sm text-foreground"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={isPending || !newName.trim() || !newEmail.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-sm font-semibold text-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Partner erzeugen
              </button>
            </div>
          </form>

          {lastCreated && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
              <p className="text-xs font-medium text-emerald-700 flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5 shrink-0" />
                Ref-Link für den Partner
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-[11px] text-foreground break-all bg-white px-2 py-1.5 rounded-lg border border-border">
                  {lastCreated.refUrl}
                </code>
                <button
                  type="button"
                  onClick={() => void copyText(lastCreated.refUrl)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-foreground hover:bg-card"
                >
                  <Copy className="w-3 h-3" />
                  Link kopieren
                </button>
                <button
                  type="button"
                  onClick={() => void copyText(lastCreated.code)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-card"
                >
                  Code: {lastCreated.code}
                </button>
                <button
                  type="button"
                  onClick={() => void copyText(lastCreated.tempPassword)}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700 hover:bg-amber-100"
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
