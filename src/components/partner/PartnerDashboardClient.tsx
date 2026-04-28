"use client";

import { signOut } from "next-auth/react";
import { Copy } from "lucide-react";

type Row = {
  id: string;
  companyName: string;
  createdAt: string;
  plan: "STARTER" | "BUSINESS" | "ENTERPRISE";
  status: "PENDING" | "AVAILABLE" | "PAID" | "CANCELLED";
  commissionCents: number;
  currency: string;
  paidAt: string | null;
};

function formatCents(cents: number, currency: string) {
  const amount = (cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${amount} ${currency.toUpperCase()}`;
}

export function PartnerDashboardClient({
  name,
  code,
  refUrl,
  pendingCents,
  availableCents,
  paidCents,
  rows,
}: {
  name: string;
  code: string;
  refUrl: string;
  pendingCents: number;
  availableCents: number;
  paidCents: number;
  rows: Row[];
}) {
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Partner Dashboard</h1>
            <p className="text-sm text-white/45">Willkommen, {name}. Hier siehst du deine Abschluesse und Bounties.</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/partner-login" })}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70 hover:bg-white/5"
          >
            Abmelden
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#141414] p-4">
          <p className="text-xs uppercase tracking-wider text-white/35 mb-2">Dein Ref-Link</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white/80 break-all">{refUrl}</code>
            <button onClick={() => void copy(refUrl)} className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs text-white/80 hover:bg-white/15">
              <Copy className="w-3 h-3" />
              Link kopieren
            </button>
            <span className="text-[11px] text-white/45 font-mono">Code: {code}</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-amber-300/20 bg-amber-400/5 p-4">
            <p className="text-xs text-white/45">Ausstehend</p>
            <p className="text-lg font-semibold text-amber-200">{formatCents(pendingCents, "eur")}</p>
          </div>
          <div className="rounded-xl border border-emerald-300/20 bg-emerald-500/5 p-4">
            <p className="text-xs text-white/45">Verfuegbar</p>
            <p className="text-lg font-semibold text-emerald-200">{formatCents(availableCents, "eur")}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs text-white/45">Ausgezahlt</p>
            <p className="text-lg font-semibold text-white/85">{formatCents(paidCents, "eur")}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#141414] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="font-semibold">Abschluesse & Bounties</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/45">
                  {["Firma", "Plan", "Bounty", "Status", "Abschluss", "Ausgezahlt am"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-white/40">Noch keine Abschluesse.</td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-white/5">
                      <td className="px-4 py-2.5">{row.companyName}</td>
                      <td className="px-4 py-2.5 text-white/60">{row.plan}</td>
                      <td className="px-4 py-2.5 text-emerald-300">{formatCents(row.commissionCents, row.currency)}</td>
                      <td className="px-4 py-2.5 text-white/65">{row.status}</td>
                      <td className="px-4 py-2.5 text-white/50">{new Date(row.createdAt).toLocaleDateString("de-DE")}</td>
                      <td className="px-4 py-2.5 text-white/50">{row.paidAt ? new Date(row.paidAt).toLocaleDateString("de-DE") : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

