"use client";

import { signOut } from "next-auth/react";
import { Copy } from "lucide-react";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";

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

function statusTone(status: Row["status"]): StatusTone {
  if (status === "PENDING") return "warning";
  if (status === "AVAILABLE") return "brand";
  if (status === "PAID") return "neutral";
  return "danger";
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
    <div className="premium-enter min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Partner Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Willkommen, {name}. Hier finden Sie Ihre Abschlüsse und Provisionen im Überblick.
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/partner-login" })}
            className="btn-outline text-sm"
          >
            Abmelden
          </button>
        </div>

        <div className="glass-card p-5">
          <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Ihr Referenzlink</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="break-all rounded-2xl border border-line bg-surface px-2 py-1.5 text-xs text-foreground dark:border-white/10 dark:bg-surface/85">
              {refUrl}
            </code>
            <button
              onClick={() => void copy(refUrl)}
              className="inline-flex items-center gap-1 rounded-2xl border border-line bg-surface px-2.5 py-1.5 text-xs text-foreground transition-colors duration-150 hover:bg-surface-muted active:brightness-95 dark:border-white/10 dark:bg-surface/85"
            >
              <Copy className="h-3 w-3" />
              Link kopieren
            </button>
            <span className="text-[11px] text-muted-foreground">Code: {code}</span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-warning/30 bg-warning-soft p-4 dark:border-white/10 dark:bg-warning/20">
            <p className="text-xs text-muted-foreground">Ausstehend</p>
            <p className="text-lg font-semibold tabular-nums text-warning-foreground">{formatCents(pendingCents, "eur")}</p>
          </div>
          <div className="rounded-2xl border border-brand/30 bg-brand-soft p-4 dark:border-white/10 dark:bg-brand/22">
            <p className="text-xs text-muted-foreground">Verfügbares Guthaben</p>
            <p className="text-lg font-semibold tabular-nums text-brand">{formatCents(availableCents, "eur")}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground">Ausgezahlt</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">{formatCents(paidCents, "eur")}</p>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold">Ihre Erfolgsstatistik</h2>
              <p className="text-xs text-muted-foreground">Einmalige Provision pro direktem Abschluss (ohne Testphase).</p>
            </div>
            <button
              type="button"
              className="btn-outline text-sm"
              onClick={() =>
                window.alert(
                  "Werbemittel (Logos, Screenshots und Textbausteine) werden hier in Kürze bereitgestellt."
                )
              }
            >
              Werbemittel-Kit
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-line bg-surface p-4 dark:border-white/10 dark:bg-surface/85">
              <p className="text-xs text-muted-foreground">Starter-Abschlüsse</p>
              <p className="mt-1 text-sm tabular-nums text-foreground">
                {starterDeals.length} (insg. {formatCents(starterTotalCents, "eur")})
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-4 dark:border-white/10 dark:bg-surface/85">
              <p className="text-xs text-muted-foreground">Business-Abschlüsse</p>
              <p className="mt-1 text-sm tabular-nums text-foreground">
                {businessDeals.length} (insg. {formatCents(businessTotalCents, "eur")})
              </p>
            </div>
            <div className="rounded-2xl border border-brand/30 bg-brand-soft p-4 dark:border-white/10 dark:bg-brand/22">
              <p className="text-xs text-muted-foreground">Gesamtguthaben</p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-brand">{formatCents(totalSuccessCents, "eur")}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-brand/30 bg-brand-soft p-5 dark:border-white/10 dark:bg-brand/20">
          <p className="text-sm font-semibold text-brand">Verdienst-Struktur</p>
          <p className="mt-1 text-sm leading-relaxed text-foreground">
            5€ für jeden Starter-Abschluss, 15€ für jeden Business-Abschluss. Auszahlung erfolgt nach Bestätigung des
            Kunden-Abos. Es zählt nur ein direkter Abschluss – die 7-Tage-Testphase zählt nicht.
          </p>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="border-b border-line/70 px-4 py-3 dark:border-white/10">
            <h2 className="font-semibold">Letzte Abschlüsse</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line/70 bg-surface-muted/60 text-muted-foreground dark:border-white/10 dark:bg-surface-muted/30">
                  {["Plan", "Ihre Provision"].map((h) => (
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
                    <tr
                      key={row.id}
                      className="border-b border-line/70 transition-colors active:bg-background/70 md:hover:bg-surface-muted/60 dark:border-white/8"
                    >
                      <td className="px-4 py-4 text-foreground/80">{planLabel(row.plan)}</td>
                      <td className="px-4 py-4 tabular-nums text-brand">{formatProvisionByPlan(row.plan)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="border-b border-line/70 px-4 py-3 dark:border-white/10">
            <h2 className="font-semibold">Alle Abschlüsse</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line/70 bg-surface-muted/60 text-muted-foreground dark:border-white/10 dark:bg-surface-muted/30">
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
                    <tr
                      key={row.id}
                      className="border-b border-line/70 transition-colors active:bg-background/70 md:hover:bg-surface-muted/60 dark:border-white/8"
                    >
                      <td className="px-4 py-4">{row.companyName}</td>
                      <td className="px-4 py-4 text-foreground/80">{planLabel(row.plan)}</td>
                      <td className="px-4 py-4 tabular-nums text-brand">{formatProvisionByPlan(row.plan)}</td>
                      <td className="px-4 py-4">
                        <StatusBadge tone={statusTone(row.status)} glass size="sm">
                          {statusLabel(row.status)}
                        </StatusBadge>
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
