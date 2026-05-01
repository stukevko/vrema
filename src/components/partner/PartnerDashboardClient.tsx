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

function formatProvisionByPlan(plan: Row["plan"]) {
  if (plan === "STARTER") return "5,00 EUR";
  if (plan === "BUSINESS") return "15,00 EUR";
  return "—";
}

function planLabel(plan: Row["plan"]) {
  if (plan === "STARTER") return "Starter";
  if (plan === "BUSINESS") return "Business";
  return "Enterprise";
}

function statusLabel(status: Row["status"]) {
  if (status === "PENDING") return "In Prüfung";
  if (status === "AVAILABLE") return "Auszahlbar";
  if (status === "PAID") return "Bereits ausgezahlt";
  return "Storniert";
}

function statusBadgeClass(status: Row["status"]) {
  if (status === "PENDING") return "bg-amber-50 text-amber-700";
  if (status === "AVAILABLE") return "bg-emerald-50 text-emerald-700";
  if (status === "PAID") return "bg-slate-100 text-slate-700";
  return "bg-red-50 text-red-700";
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

  const recentDeals = rows.slice(0, 8);
  const validDeals = rows.filter((r) => r.status !== "CANCELLED");
  const starterDeals = validDeals.filter((r) => r.plan === "STARTER");
  const businessDeals = validDeals.filter((r) => r.plan === "BUSINESS");
  const starterTotalCents = starterDeals.length * 500;
  const businessTotalCents = businessDeals.length * 1500;
  const totalSuccessCents = starterTotalCents + businessTotalCents;

  return (
    <div className="min-h-screen bg-background text-foreground p-6 premium-enter">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Partner Dashboard</h1>
            <p className="text-sm text-muted-foreground">Willkommen, {name}. Hier siehst du deine Abschluesse und Provisionen.</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/partner-login" })}
            className="rounded-2xl border border-border px-3 py-2 text-sm text-foreground hover:bg-slate-50"
          >
            Abmelden
          </button>
        </div>

        <div className="rounded-2xl premium-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Dein Ref-Link</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-2xl border border-border bg-white px-2 py-1.5 text-xs text-foreground break-all">{refUrl}</code>
            <button onClick={() => void copy(refUrl)} className="inline-flex items-center gap-1 rounded-2xl border border-border bg-white px-2.5 py-1.5 text-xs text-foreground hover:bg-slate-50">
              <Copy className="w-3 h-3" />
              Link kopieren
            </button>
            <span className="text-[11px] text-muted-foreground">Code: {code}</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs text-muted-foreground">Ausstehend</p>
            <p className="text-lg font-semibold text-amber-700 tabular-nums">{formatCents(pendingCents, "eur")}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs text-muted-foreground">Verfügbares Guthaben</p>
            <p className="text-lg font-semibold text-emerald-700 tabular-nums">{formatCents(availableCents, "eur")}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Ausgezahlt</p>
            <p className="text-lg font-semibold text-foreground tabular-nums">{formatCents(paidCents, "eur")}</p>
          </div>
        </div>

        <div className="rounded-2xl premium-card p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold">Deine Erfolgs-Statistik</h2>
              <p className="text-xs text-muted-foreground">Einmalige Provision pro direktem Abschluss (ohne Testphase).</p>
            </div>
            <button
              type="button"
              className="rounded-2xl border border-border bg-white px-4 py-2 text-sm text-foreground hover:bg-slate-50"
              onClick={() => window.alert("Hier findest du bald Logos, Screenshots und Texte für WhatsApp/Instagram.")}
            >
              Werbemittel-Kit
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-white p-4">
              <p className="text-xs text-muted-foreground">Starter-Abschlüsse</p>
              <p className="mt-1 text-sm text-foreground tabular-nums">
                {starterDeals.length} (insg. {formatCents(starterTotalCents, "eur")})
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-white p-4">
              <p className="text-xs text-muted-foreground">Business-Abschlüsse</p>
              <p className="mt-1 text-sm text-foreground tabular-nums">
                {businessDeals.length} (insg. {formatCents(businessTotalCents, "eur")})
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs text-muted-foreground">Gesamtguthaben</p>
              <p className="mt-1 text-sm font-semibold text-emerald-700 tabular-nums">{formatCents(totalSuccessCents, "eur")}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-semibold text-emerald-700">Verdienst-Struktur</p>
          <p className="mt-1 text-sm text-emerald-700/85 leading-relaxed">
            5€ für jeden Starter-Abschluss, 15€ für jeden Business-Abschluss. Auszahlung erfolgt nach Bestätigung des
            Kunden-Abos. Es zählt nur ein direkter Abschluss - eine 14-Tage-Testphase zählt nicht.
          </p>
        </div>

        <div className="rounded-2xl premium-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold">Letzte Abschlüsse</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/80 text-muted-foreground">
                  {["Plan", "Deine Provision"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentDeals.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">Alles ruhig hier. Genieße die Pause! ☕</td>
                  </tr>
                ) : (
                  recentDeals.map((row) => (
                    <tr key={row.id} className="border-b border-border active:bg-background/70 md:hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 text-foreground/80">{planLabel(row.plan)}</td>
                      <td className="px-4 py-4 text-emerald-700 tabular-nums">{formatProvisionByPlan(row.plan)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl premium-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold">Alle Abschlüsse</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/80 text-muted-foreground">
                  {["Firma", "Plan", "Provision", "Status", "Abschluss", "Ausgezahlt am"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Alles ruhig hier. Genieße die Pause! ☕</td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-border active:bg-background/70 md:hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4">{row.companyName}</td>
                      <td className="px-4 py-4 text-foreground/80">{planLabel(row.plan)}</td>
                      <td className="px-4 py-4 text-emerald-700 tabular-nums">{formatProvisionByPlan(row.plan)}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusBadgeClass(row.status)}`}
                          title={row.status === "PENDING" ? "Kunde im Testzeitraum" : undefined}
                        >
                          {statusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">{new Date(row.createdAt).toLocaleDateString("de-DE")}</td>
                      <td className="px-4 py-4 text-muted-foreground">{row.paidAt ? new Date(row.paidAt).toLocaleDateString("de-DE") : "—"}</td>
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

